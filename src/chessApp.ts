import { Score } from "../carp-wasm/carp_wasm.js";
import { Chess, Move } from "chess.js";
import {
  Square,
  Color,
  Chessboard,
  ChessBoardInstance,
  Config,
  MARKER_TYPE,
  COLOR,
  INPUT_EVENT_TYPE,
} from "cm-chessboard-ts";
import { PromotionDialog } from "cm-chessboard-ts/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js";

// Import the cm-chessboard css
import "cm-chessboard-ts/assets/styles/cm-chessboard.css";
import "cm-chessboard-ts/src/cm-chessboard/extensions/promotion-dialog/assets/promotion-dialog.css";

const MarkerMoveWhite = { class: "myMarkerMoveWhite", slice: "markerSquare" };
const MarkerMoveBlack = { class: "myMarkerMoveBlack", slice: "markerSquare" };

function squareToIndex(square: string): number {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square.charAt(1)) - 1;
  return 8 * rank + file;
}

export class ChessApp {
  public player: Color = COLOR.white;
  private chessGame: Chess = new Chess();
  private evalBar: EvalBar = new EvalBar("evalBar");
  private chessBoard: ChessBoardInstance = this.initChessBoard();
  private engineWorker: Worker = new Worker(
    new URL("./engineWorker.ts", import.meta.url),
    { type: "module" },
  );

  // UI/UX
  private possibleTargets: Set<Square> | null = null;
  private gameOverOverlay: HTMLDivElement = document.getElementById(
    "gameOverOverlay",
  ) as HTMLDivElement;
  private gameOverText: HTMLDivElement = document.getElementById(
    "gameOverText",
  ) as HTMLDivElement;
  private gameOverRestartBtn: HTMLButtonElement = document.getElementById(
    "gameOverRestart",
  ) as HTMLButtonElement;

  private constructor() {}

  static async create(): Promise<ChessApp> {
    const app = new ChessApp();
    app.reset();

    // Setup event listeners
    app.gameOverRestartBtn.onclick = () => app.reset(); //
    window.addEventListener("resize", () => app.resize());
    app.resize();

    // Return a promise that resolves when the worker is ready
    await new Promise<void>((resolve) => {
      app.engineWorker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === "ready") {
          resolve();
        } else if (type === "searchResult") {
          app.updateSearchData?.(data);
        } else if (type === "perftResult") {
          app.updatePerftData?.(data);
        } else if (type === "enginePick") {
          app.updateEnginePick?.(data);
        }
      };
      app.engineWorker.postMessage({ type: "init" });
    });

    return app;
  }

  private removeTargetHighlights() {
    this.chessBoard.removeMarkers(MARKER_TYPE.dot);
    this.chessBoard.removeMarkers(MARKER_TYPE.circle);
    this.possibleTargets = null;
  }

  private removeMoveHighlights() {
    this.chessBoard.removeMarkers(MarkerMoveWhite);
    this.chessBoard.removeMarkers(MarkerMoveBlack);
  }

  private addTargetHighlights(square: Square) {
    const moves = this.chessGame.moves({ square: square, verbose: true });
    this.removeTargetHighlights();
    this.possibleTargets = new Set();

    for (let i = 0; i < moves.length; i++) {
      const tgt = (moves[i] as Move).to;
      const capture = this.chessGame.get(tgt);
      const marker =
        capture !== undefined ? MARKER_TYPE.circle : MARKER_TYPE.dot;

      this.chessBoard.addMarker(marker, tgt as Square);
      this.possibleTargets.add(tgt);
    }
  }

  private addMoveHighlight(square: Square) {
    const isBlackSquare = squareToIndex(square as string) % 2 === 0;
    if (isBlackSquare) {
      this.chessBoard.addMarker(MarkerMoveBlack, square);
    } else {
      this.chessBoard.addMarker(MarkerMoveWhite, square);
    }
  }

  private addMoveHighlights(from: Square, to: Square) {
    this.addMoveHighlight(from);
    this.addMoveHighlight(to);
  }

  private makeEngineMove() {
    const uciPosition = "fen " + this.chessGame.fen();
    const uciTc = "wtime 10000 btime 10000 winc 0 binc 0";
    this.engineWorker.postMessage({
      type: "search",
      data: { position: uciPosition, tc: uciTc },
    });
  }

  private showGameOver(text: string) {
    this.gameOverText.textContent = text;
    this.gameOverOverlay.classList.add("visible");
    this.gameOverOverlay.setAttribute("aria-hidden", "false");
  }

  private hideGameOver() {
    this.gameOverOverlay.classList.remove("visible");
    this.gameOverOverlay.setAttribute("aria-hidden", "true");
  }

  private gameOver() {
    if (this.chessGame.isCheckmate()) {
      const sideToMove = this.chessGame.turn();
      const playerWin = sideToMove !== this.player;
      const whiteWin = sideToMove === "b";

      this.evalBar.updateEvaluation(whiteWin ? "Mate" : "Mated", {
        val: 1,
        w: whiteWin ? 1000 : 0,
        d: 0,
        l: whiteWin ? 0 : 1000,
      } as Score);
      this.showGameOver(playerWin ? "You win!" : "You lose!");
    } else {
      this.evalBar.updateEvaluation("cp", {
        val: 0,
        w: 0,
        d: 1000,
        l: 0,
      } as Score);
      this.showGameOver("It's a draw!");
    }
  }

  private async applyMoveToGame(
    move: string | { from: string; to: string; promotion?: string },
    engineReply: boolean = false,
  ) {
    const m = this.chessGame.move(move);
    await this.chessBoard.setPosition(this.chessGame.fen(), true);
    this.removeMoveHighlights();
    this.addMoveHighlights(m.from, m.to);

    if (this.chessGame.isGameOver()) {
      this.gameOver();
    } else if (engineReply) {
      this.makeEngineMove();
    }
  }

  private moveEventHandler(event: any) {
    switch (event.type) {
      case INPUT_EVENT_TYPE.moveInputStarted:
        this.addTargetHighlights(event.square);
        return true;
      case INPUT_EVENT_TYPE.validateMoveInput:
        const [from, to, piece] = [
          event.squareFrom,
          event.squareTo,
          event.piece,
        ];
        const player = (piece as string).charAt(0);
        const illegalMove =
          player != this.player || !this.possibleTargets?.has(to);

        this.removeTargetHighlights();
        if (illegalMove) return false;

        // Promotion popup
        const isPawn = (piece as string).charAt(1) === "p";
        const rank = (to as string).charAt(1);
        const isPromotion =
          (rank == "8" && this.player === COLOR.white) ||
          (rank == "1" && this.player === COLOR.black);

        if (isPawn && isPromotion) {
          // @ts-ignore
          this.chessBoard.showPromotionDialog(to, this.player, (result) => {
            if (result && result.piece) {
              this.applyMoveToGame(
                { from, to, promotion: result.piece.charAt(1) },
                true,
              );
            } else {
              this.chessBoard.movePiece(to, from, false);
            }
          });
          return true;
        }

        this.applyMoveToGame({ from, to }, true);

        return true;
      case INPUT_EVENT_TYPE.moveInputCanceled:
        this.removeTargetHighlights();
    }
  }

  private initChessBoard(): ChessBoardInstance {
    const config: Config = {
      position: this.chessGame.fen(),
      orientation: this.player,
      responsive: true,
      animationDuration: 200,
      style: {
        cssClass: "green",
        showCoordinates: false,
        borderType: "none",
        aspectRatio: 1,
        moveFromMarker: MARKER_TYPE.frame,
        moveToMarker: MARKER_TYPE.frame,
      },
      sprite: {
        url: "/vendor/chessboard-sprite-staunty.svg",
        size: 40,
        cache: true,
      },
      extensions: [{ class: PromotionDialog }],
    };
    const node = document.getElementById("board")!;
    const board = new Chessboard(node, config);
    board.enableMoveInput((event) => {
      return this.moveEventHandler(event);
    });

    return board;
  }

  private resize() {
    // First, need to shrink the evalbar.
    const evalBarElem = document.getElementById("evalBar")!;
    evalBarElem.style.height = "0px";

    // Manually resize the board
    (this.chessBoard as any).view.handleResize();

    // Set eval bar height to match board height
    const boardElem = document.getElementById("board")!;
    const boardRect = boardElem.getBoundingClientRect();
    evalBarElem.style.height = boardRect.height + "px";
  }

  async reset() {
    this.resize();
    this.hideGameOver();
    this.removeMoveHighlights();

    this.chessGame.reset();
    this.evalBar.reset();
    await this.chessBoard.setPosition(this.chessGame.fen(), true);

    // If the user is playing as black, start right away.
    if (this.player === "b") {
      await this.chessBoard.setOrientation(this.player);
      this.makeEngineMove();
    }
  }

  updatePerftData(data: any) {
    // PerftOutput-style data
    console.log("Perft speed: ", data.nps);
  }

  updateSearchData(data: any) {
    // SearchOutput-style data
    console.log("Search speed: ", data.nps);

    const [score_type, score] = this.getWhiteScore(data.score_type, data.score);
    this.evalBar.updateEvaluation(score_type, score);
  }

  private getWhiteScore(score_type: string, score: Score): [string, Score] {
    if (this.player == "b") return [score_type, score];

    if (score_type === "Mate") score_type = "Mated";
    else if (score_type === "Mated") score_type = "Mate";
    else score.val = -score.val;

    const [w, l] = [score.w, score.l];
    score.w = l;
    score.l = w;
    return [score_type, score];
  }

  async updateEnginePick(data: string) {
    console.log("Engine pick: ", data);
    this.applyMoveToGame(data);
  }
}

// From: https://github.com/trevor-ofarrell/chess-evaluation-bar/blob/main/src/lib/components/EvalBar.js
function evalToPercent(x: number): number {
  if (x === 0) {
    return 0;
  } else if (x < 7) {
    return -(0.322495 * Math.pow(x, 2)) + 7.26599 * x + 4.11834;
  } else {
    return (8 * x) / 145 + 5881 / 145;
  }
}

class EvalBar {
  private container: HTMLElement;
  private blackDiv: HTMLDivElement;
  private whiteDiv: HTMLDivElement;
  private scoreDivWhite: HTMLDivElement;
  private scoreDivBlack: HTMLDivElement;

  // Margin for text at top/bottom (as percent of bar height)
  private readonly minRoomPercent = 10; // 10%

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;

    this.blackDiv = this.container.querySelector(
      ".eval-bar-black",
    ) as HTMLDivElement;
    this.whiteDiv = this.container.querySelector(
      ".eval-bar-white",
    ) as HTMLDivElement;
    this.scoreDivWhite = this.container.querySelector(
      ".eval-bar-score.white",
    ) as HTMLDivElement;
    this.scoreDivBlack = this.container.querySelector(
      ".eval-bar-score.black",
    ) as HTMLDivElement;
  }

  reset() {
    this.blackDiv.style.height = "50%";
    this.whiteDiv.style.height = "50%";
    this.scoreDivWhite.style.display = "none";
    this.scoreDivBlack.style.display = "none";
  }

  updateEvaluation(scoreType: string, score: Score) {
    // Defaults
    let whiteHeight = 0.5; // percent (0-1)
    let displayText = "";
    let showWhite = true,
      showBlack = false;

    if (scoreType === "Cp") {
      // Cp: non-linear scale, leave room at top/bottom
      const evalCp = score.val / 100;
      const percent = evalToPercent(Math.abs(evalCp));
      const clippedPercent = Math.min(50 - this.minRoomPercent, percent);

      displayText = (evalCp > 0 ? "+" : "") + evalCp.toFixed(2);
      whiteHeight =
        (50 + (evalCp > 0 ? clippedPercent : -clippedPercent)) / 100;
      showWhite = true;
      showBlack = false;
    } else if (scoreType === "Mate") {
      // Mate
      whiteHeight = 1;
      displayText = `M${score.val}`;
      showWhite = true;
      showBlack = false;
    } else if (scoreType === "Mated") {
      // Mated
      whiteHeight = 0;
      displayText = `-M${score.val}`;
      showWhite = false;
      showBlack = true;
    }

    // Set heights
    this.whiteDiv.style.height = `${whiteHeight * 100}%`;
    this.blackDiv.style.height = `${(1 - whiteHeight) * 100}%`;

    // Set score label
    this.scoreDivWhite.style.display = showWhite ? "block" : "none";
    this.scoreDivBlack.style.display = showBlack ? "block" : "none";
    if (showWhite) {
      this.scoreDivWhite.textContent = displayText;
      this.scoreDivWhite.style.color = "#222";
      this.scoreDivWhite.style.top = "2px";
    }
    if (showBlack) {
      this.scoreDivBlack.textContent = displayText;
      this.scoreDivBlack.style.color = "#fff";
      this.scoreDivBlack.style.bottom = "2px";
    }
  }
}

export const chessApp = await ChessApp.create();
