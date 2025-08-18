import { EvalBar, Score, ScoreType } from "./evalBar.js";
import { wasmModulePromise } from "./wasmPreload.js";

import { Chess, Move } from "chess.js";
import { Config, ChessboardInstance, Chessboard, Square, Color, COLOR, INPUT_EVENT_TYPE } from "cm-chessboard/src/Chessboard.js";
import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

import "cm-chessboard/assets/chessboard.css";
import "cm-chessboard/assets/extensions/markers/markers.css";
import "cm-chessboard/assets/extensions/promotion-dialog/promotion-dialog.css";

const MOVE_MARKERS = {
  moveWhite: { class: "myMarkerMoveWhite", slice: "markerSquare" },
  moveBlack: { class: "myMarkerMoveBlack", slice: "markerSquare" },
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
  private cpBar: EvalBar = new EvalBar("cpBar", ScoreType.CP);
  private wdlBar: EvalBar = new EvalBar("wdlBar", ScoreType.WDL);
  private chessBoard: ChessboardInstance = this.initChessBoard();

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

    // Create worker (and terminate existing one)
    if (this.engineWorker) this.engineWorker.terminate();
    const worker = new Worker(new URL("./engineWorker.ts", import.meta.url), {
      type: "module",
    });
    this.engineWorker = worker;

    // await wasm compilation
    const module = await wasmModulePromise;

    // Persistent (after init) message routing
    const routeMessage = (e: MessageEvent) => {
      const { type, data } = e.data ?? {};
      if (type === "searchResult") this.updateSearchData?.(data);
      else if (type === "perftResult") this.updatePerftData?.(data);
      else if (type === "enginePick") this.updateEnginePick?.(data);
    };

    // Setup promise as one-time listener for the ready message.
    this.workerPromise = new Promise<void>((resolve) => {
      const onReady = (e: MessageEvent) => {
        if (e.data?.type !== "ready") return;
        worker.removeEventListener("message", onReady);
        worker.addEventListener("message", routeMessage);

        this.workerState = WorkerState.Initialized;
        this.loadingOverlay.hide();
        resolve();
      };
      worker.addEventListener("message", onReady);
    });

    // Send init message.
    worker.postMessage({ type: "init", module });
    return this.workerPromise;
  }

  private removeTargetHighlights() {
    this.chessBoard.removeMarkers(MARKER_TYPE.dot);
    this.chessBoard.removeMarkers(MARKER_TYPE.circle);
    this.possibleTargets = null;
  }

  private removeMoveHighlights() {
    this.chessBoard.removeMarkers(MOVE_MARKERS.moveWhite);
    this.chessBoard.removeMarkers(MOVE_MARKERS.moveBlack);
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
    function squareToIndex(square: string): number {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square.charAt(1)) - 1;
      return 8 * rank + file;
    }

    const isBlackSquare = squareToIndex(square as string) % 2 === 0;
    if (isBlackSquare) {
      this.chessBoard.addMarker(MOVE_MARKERS.moveBlack, square);
    } else {
      this.chessBoard.addMarker(MOVE_MARKERS.moveWhite, square);
    }
  }

  private addMoveHighlights(from: Square, to: Square) {
    this.addMoveHighlight(from);
    this.addMoveHighlight(to);
  }

  private makeEngineMove() {
    if (this.workerState !== WorkerState.Initialized) return;

    const uciPosition = "fen " + this.chessGame.fen();
    const uciTc = "movetime 1000";
    this.engineWorker!.postMessage({
      type: "search",
      data: { position: uciPosition, tc: uciTc },
    });
  }

  private gameOver() {
    let scoreType: string;
    let score: Score;
    let overlayText: string;

    if (this.chessGame.isCheckmate()) {
      const sideToMove = this.chessGame.turn();
      const playerWin = sideToMove !== this.player;
      const whiteWin = sideToMove === "b";

      scoreType = whiteWin ? "Mate" : "Mated";
      score = { val: 1, w: whiteWin ? 1000 : 0, d: 0, l: whiteWin ? 0 : 1000 };
      overlayText = playerWin ? "You win!" : "You lose!";
    } else {
      scoreType = "Cp";
      score = { val: 0, w: 0, d: 1000, l: 0 };
      overlayText = "It's a draw!";
    }

    this.cpBar.updateEvaluation(scoreType, score);
    this.wdlBar.updateEvaluation(scoreType, score);
    this.gameOverOverlay.show(overlayText);
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
        console.log(event, this.chessBoard.getMarkers());
        this.addMoveHighlight(event.square);
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
        this.chessBoard.removeMarkers(undefined, event.squareFrom);
        this.removeTargetHighlights();
    }
  }

  private initChessBoard(): ChessboardInstance {
    const config: Config = {
      position: this.chessGame.fen(),
      orientation: this.player,
      responsive: true,
      animationDuration: 200,
      assetsUrl: "/vendor/",
      assetsCache: true,
      style: {
        cssClass: "green",
        showCoordinates: false,
        borderType: "none",
        aspectRatio: 1,
        pieces: {
          file: "staunty.svg",
          tileSize: 40
        }
      },
      extensions: [
        { class: PromotionDialog },
        { class: Markers, props: { autoMarkers: null, sprite: "markers.svg" } }
      ],
    };
    const node = document.getElementById("board")!;
    const board = new Chessboard(node, config);
    board.enableMoveInput((event: any) => {
      return this.moveEventHandler(event);
    });

    return board;
  }

  private resize() {
    // First, need to shrink the evalbar.
    this.cpBar.setHeight("0px");
    this.wdlBar.setHeight("0px");

    // Manually resize the board
    (this.chessBoard as any).view.handleResize();

    // Set eval bar height to match board height
    const boardElem = document.getElementById("board")!;
    const height: string = boardElem.getBoundingClientRect().height + "px";
    this.cpBar.setHeight(height);
    this.wdlBar.setHeight(height);
  }

  async resetState() {
    this.resize();
    this.gameOverOverlay.hide();
    this.removeMoveHighlights();

    this.chessGame.reset();
    this.cpBar.reset();
    this.wdlBar.reset();

    await this.chessBoard.setPosition(this.chessGame.fen(), true);
    if (this.player == "b") await this.chessBoard.setOrientation(this.player);

    await this.workerPromise; // Wait for worker to be ready
    if (this.player === "b") this.makeEngineMove(); // If the user is playing as black, start right away.
  }

  updatePerftData(data: any) {
    // PerftOutput-style data
    console.log("Perft speed: ", data.nps);
  }

  updateSearchData(data: any) {
    // SearchOutput-style data
    console.log("Search speed: ", data.nps);
    const scoreType: string = data.score_type;
    const score: Score = data.score;
    const flip: boolean = this.player === COLOR.white;

    this.cpBar.updateEvaluation(scoreType, score, flip);
    this.wdlBar.updateEvaluation(scoreType, score, flip);
  }

  updateEnginePick(data: string) {
    console.log("Engine pick: ", data);
    this.applyMoveToGame(data);
  }
}
