import { EvalBar } from "./evalBar.js"
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

enum WorkerState {
  Uninitialized = "uninitialized",
  Initializing = "initializing",
  Initialized = "initialized",
}

class Overlay {
  private overlayElement: HTMLDivElement;
  private overlayText: HTMLDivElement;

  constructor(id: string) {
    this.overlayElement = document.getElementById(id)! as HTMLDivElement;
    this.overlayText = this.overlayElement.querySelector(
      ".overlay-text",
    ) as HTMLDivElement;
  }

  show(text: string | null): void {
    if (text !== null) this.overlayText.textContent = text;
    this.overlayElement.classList.add("visible");
    this.overlayElement.setAttribute("aria-hidden", "false");
  }

  hide(): void {
    this.overlayElement.classList.remove("visible");
    this.overlayElement.setAttribute("aria-hidden", "true");
  }
}

export class ChessApp {
  public player: Color = COLOR.white;
  private chessGame: Chess = new Chess();
  private evalBar: EvalBar = new EvalBar("evalBar");
  private chessBoard: ChessBoardInstance = this.initChessBoard();

  // Worker for Carp engine, lazily loaded
  private engineWorker: Worker | null = null;
  private workerState: WorkerState = WorkerState.Uninitialized;
  private workerPromise: Promise<void> | null = null;

  // UI/UX
  private possibleTargets: Set<Square> | null = null;
  private gameOverOverlay: Overlay = new Overlay("gameOverOverlay");
  private loadingOverlay: Overlay = new Overlay("loadingOverlay");

  constructor() {
    // Setup event listeners
    document.getElementById("gameOverRestart")!.onclick = async () => {
      this.initializeEngine(true);
      await this.resetState();
    };
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  async initializeEngine(restart: boolean = false): Promise<void> {
    if (this.workerState !== WorkerState.Uninitialized && !restart) {
      return this.workerPromise!;
    }

    this.workerState = WorkerState.Initializing;
    this.loadingOverlay.show("Loading...");
    
    this.workerPromise = new Promise<void>((resolve) => {
      console.log("Started loading worker.");
      // Create worker (and terminate existing one)
      if (this.engineWorker) this.engineWorker.terminate();
      const worker = new Worker(new URL("./engineWorker.ts", import.meta.url), { type: "module" });
      this.engineWorker = worker;
      
      // Persistent (after init) message routing
      const routeMessage = (e: MessageEvent) => {
        const { type, data } = e.data ?? {};
        if (type === "searchResult") this.updateSearchData?.(data);
        else if (type === "perftResult") this.updatePerftData?.(data);
        else if (type === "enginePick") this.updateEnginePick?.(data);
      };

      // One-time ready resolver
      const onReady = (e: MessageEvent) => {
        if (e.data?.type !== "ready") return;
        worker.removeEventListener("message", onReady);
        worker.addEventListener("message", routeMessage);
  
        this.workerState = WorkerState.Initialized;
        this.loadingOverlay.hide();
        console.log("Worker initialized.");
        resolve();
      };
      worker.addEventListener("message", onReady);

      // Initialize worker
      worker.postMessage({ type: "init" });
    });

    return this.workerPromise;
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
    if (this.workerState !== WorkerState.Initialized) return;

    const uciPosition = "fen " + this.chessGame.fen();
    const uciTc = "wtime 100000 btime 100000 winc 0 binc 0";
    this.engineWorker!.postMessage({
      type: "search",
      data: { position: uciPosition, tc: uciTc },
    });
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
      });
      this.gameOverOverlay.show(playerWin ? "You win!" : "You lose!");
    } else {
      this.evalBar.updateEvaluation("cp", {
        val: 0,
        w: 0,
        d: 1000,
        l: 0,
      });
      this.gameOverOverlay.show("It's a draw!");
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

  async resetState() {
    this.resize();
    this.gameOverOverlay.hide();
    this.removeMoveHighlights();
    
    this.chessGame.reset();
    this.evalBar.reset();
    await this.chessBoard.setPosition(this.chessGame.fen(), true);
    await this.chessBoard.setOrientation(this.player);
    
    await this.workerPromise; // Wait for worker to be ready
    if (this.player === "b") {
      this.makeEngineMove(); // If the user is playing as black, start right away.
    }
  }

  updatePerftData(data: any) {
    // PerftOutput-style data
    console.log("Perft speed: ", data.nps);
  }

  updateSearchData(data: any) {
    // SearchOutput-style data
    console.log("Search speed: ", data.nps);

    this.evalBar.updateEvaluation(data.score_type, data.score, this.player === "w");
  }

  updateEnginePick(data: string) {
    console.log("Engine pick: ", data);
    this.applyMoveToGame(data);
  }
}
