import * as eb from "./evalBar.js";
import { wasmModulePromise } from "./wasmPreload.js";

import * as chess from "chess.js";
import * as cm from "cm-chessboard/src/Chessboard.js";

import { Markers } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { HtmlLayer } from "cm-chessboard/src/extensions/html-layer/HtmlLayer.js";

import "cm-chessboard/assets/chessboard.css";
import "cm-chessboard/assets/extensions/markers/markers.css";
import "cm-chessboard/assets/extensions/promotion-dialog/promotion-dialog.css";

const CUSTOM_MARKERS = {
  white: { class: "customMarkerWhite", slice: "markerSquare" },
  black: { class: "customMarkerBlack", slice: "markerSquare" },
};

enum WorkerState {
  Uninitialized = "uninitialized",
  Initializing = "initializing",
  Initialized = "initialized",
}

const gameOverHTML: string = `
<div class="overlay-content">
  <div id="gameOverText" class="overlay-text"></div>
  <div id="gameOverRestart" class="game-over-arrow" role="button" aria-label="Restart game" title="Restart game" tabindex="0">
    ⟳
  </div>
</div>
`;

const loadingHTML: string = `
<div class="overlay-content">
  <div class="loading-spinner"></div>
  <div class="overlay-text"></div>
</div>
`;

class Overlay {
  private layer: HTMLDivElement;
  private overlayText: HTMLDivElement;

  constructor(layer: HTMLDivElement) {
    this.layer = layer;
    this.overlayText =
      this.layer.querySelector<HTMLDivElement>(".overlay-text")!;
    this.hide();
  }

  show(text: string | null): void {
    if (text !== null) this.overlayText.textContent = text;
    this.layer.classList.add("visible");
    this.layer.setAttribute("aria-hidden", "false");
  }

  hide(): void {
    this.layer.classList.remove("visible");
    this.layer.setAttribute("aria-hidden", "true");
  }
}

export class ChessApp {
  public player: cm.Color = cm.COLOR.white;
  private chessGame: chess.Chess = new chess.Chess();
  private cpBar: eb.EvalBar = new eb.EvalBar("cpBar", eb.ScoreType.CP);
  private wdlBar: eb.EvalBar = new eb.EvalBar("wdlBar", eb.ScoreType.WDL);
  private chessBoard: cm.ChessboardInstance = this.initChessBoard();

  // Worker for Carp engine, lazily loaded
  private engineWorker: Worker | null = null;
  private workerState: WorkerState = WorkerState.Uninitialized;
  private workerPromise: Promise<void> | null = null;

  // UI/UX
  private selectedSquare: cm.Square | null = null;
  private possibleTargets: Set<cm.Square> | null = null;
  private gameOverOverlay: Overlay;
  private loadingOverlay: Overlay;
  private fenInput: HTMLInputElement =
    document.querySelector<HTMLInputElement>("#fenInput")!;

  constructor() {
    // Setup overlays
    const gameOver = this.chessBoard.addHtmlLayer(gameOverHTML);
    const loading = this.chessBoard.addHtmlLayer(loadingHTML);
    this.gameOverOverlay = new Overlay(gameOver as HTMLDivElement);
    this.loadingOverlay = new Overlay(loading as HTMLDivElement);

    // Setup event listeners
    document.getElementById("gameOverRestart")!.onclick = async () => {
      this.initializeEngine(true);
      await this.startGame();
    };

    // Auto-select all text in input field
    this.fenInput.addEventListener("focus", () => this.fenInput.select());
    this.fenInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      const fen = this.fenInput.value.trim() ?? "";

      if (!fen || !chess.validateFen(fen).ok) {
        this.fenInput.value = this.chessGame.fen();
      } else {
        this.initializeEngine(true);
        await this.startGame(fen);
      }
    });

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

  private addCustomMarker(square: cm.Square) {
    function squareToIndex(square: string): number {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square.charAt(1)) - 1;
      return 8 * rank + file;
    }

    if (squareToIndex(square as string) % 2 === 0) {
      this.chessBoard.addMarker(CUSTOM_MARKERS.black, square);
    } else {
      this.chessBoard.addMarker(CUSTOM_MARKERS.white, square);
    }
  }

  private removeSelectionMarkers() {
    if (this.selectedSquare === null) {
      return;
    }

    this.chessBoard.removeLegalMovesMarkers();
    this.chessBoard.removeMarkers(undefined, this.selectedSquare);
    this.possibleTargets = null;
    this.selectedSquare = null;
  }

  private removeAllMarkers() {
    this.removeSelectionMarkers();
    this.chessBoard.removeMarkers(CUSTOM_MARKERS.black);
    this.chessBoard.removeMarkers(CUSTOM_MARKERS.white);
  }

  private addSelectionMarkers(square: cm.Square) {
    const moves = this.chessGame.moves({ square: square, verbose: true });
    this.possibleTargets = new Set();
    this.selectedSquare = square;

    this.addCustomMarker(square);
    this.chessBoard.addLegalMovesMarkers(moves);
    for (let i = 0; i < moves.length; i++) {
      this.possibleTargets.add((moves[i] as chess.Move).to);
    }
  }

  private addMoveMarkers(from: cm.Square, to: cm.Square) {
    this.addCustomMarker(from);
    this.addCustomMarker(to);
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

  private disableMoveInput() {
    this.chessBoard.disableMoveInput();
    this.chessBoard.view?.visualMoveInput?.destroy?.(); // Nuke input state machine (mobile bug)
  }

  private setTurn(color: cm.Color) {
    if (color === this.player) {
      this.chessBoard.enableMoveInput((event: any) =>
        this.moveEventHandler(event),
      );
    } else {
      this.disableMoveInput();
      this.makeEngineMove();
    }
  }

  private gameOver() {
    let scoreType: string;
    let score: eb.Score;
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
    this.disableMoveInput();
  }

  private async applyMoveToGame(
    move: string | { from: string; to: string; promotion?: string },
  ) {
    const m = this.chessGame.move(move);
    this.fenInput.value = this.chessGame.fen();

    this.removeAllMarkers();
    await this.chessBoard.setPosition(this.chessGame.fen(), true);
    this.addMoveMarkers(m.from, m.to);

    if (this.chessGame.isGameOver()) {
      this.gameOver();
    } else {
      this.setTurn(this.chessGame.turn());
    }
  }

  private moveEventHandler(event: any) {
    switch (event.type) {
      case cm.INPUT_EVENT_TYPE.moveInputStarted:
        console.log(event);
        this.addSelectionMarkers(event.square);
        return true;

      case cm.INPUT_EVENT_TYPE.validateMoveInput:
        console.log(event);
        const [from, to, piece] = [
          event.squareFrom,
          event.squareTo,
          event.piece,
        ];
        const player = (piece as string).charAt(0);
        const illegalMove =
          player != this.player || !this.possibleTargets?.has(to);
        if (illegalMove) return false;

        // Promotion popup
        const isPawn = (piece as string).charAt(1) === "p";
        const rank = (to as string).charAt(1);
        const isPromotion =
          (rank == "8" && this.player === cm.COLOR.white) ||
          (rank == "1" && this.player === cm.COLOR.black);

        if (isPawn && isPromotion) {
          // @ts-ignore
          this.chessBoard.showPromotionDialog(to, this.player, (result) => {
            if (result && result.piece) {
              this.applyMoveToGame({
                from,
                to,
                promotion: result.piece.charAt(1),
              });
            } else {
              this.chessBoard.movePiece(to, from, false);
            }
          });
          return true;
        }

        this.applyMoveToGame({ from, to });
        return true;

      case cm.INPUT_EVENT_TYPE.moveInputFinished:
      case cm.INPUT_EVENT_TYPE.moveInputCanceled:
        console.log(event);
        this.removeSelectionMarkers();
        return true;
    }
  }

  private initChessBoard(): cm.ChessboardInstance {
    const config: cm.Config = {
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
          tileSize: 40,
        },
      },
      extensions: [
        { class: PromotionDialog },
        { class: Markers, props: { autoMarkers: null, sprite: "markers.svg" } },
        { class: HtmlLayer },
      ],
    };
    const node = document.getElementById("board")!;
    const board = new cm.Chessboard(node, config);
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

  async startGame(fen?: string) {
    this.resize();
    this.gameOverOverlay.hide();
    this.removeAllMarkers();

    this.cpBar.reset();
    this.wdlBar.reset();

    this.chessGame = new chess.Chess(fen); // Implicitly do startpos if fen isnt passed in.
    this.player = this.chessGame.turn() as cm.Color;
    this.fenInput.value = this.chessGame.fen();

    await this.chessBoard.setPosition(this.chessGame.fen(), true);
    await this.chessBoard.setOrientation(this.player);

    await this.workerPromise; // Wait for worker to be ready
    this.setTurn(this.chessGame.turn());
  }

  updatePerftData(data: any) {
    // PerftOutput-style data
    console.log("Perft speed: ", data.nps);
  }

  updateSearchData(data: any) {
    // SearchOutput-style data
    console.log("Search speed: ", data.nps);
    const scoreType: string = data.score_type;
    const score: eb.Score = data.score;
    const flip: boolean = this.player === cm.COLOR.white;

    this.cpBar.updateEvaluation(scoreType, score, flip);
    this.wdlBar.updateEvaluation(scoreType, score, flip);
  }

  updateEnginePick(data: string) {
    console.log("Engine pick: ", data);
    this.applyMoveToGame(data);
  }
}
