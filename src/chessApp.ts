import type { SearchOutput, PerftOutput } from '../carp-wasm/carp_wasm.js';
import { Chess, Move } from 'chess.js';
import type { BoardConfig, ChessBoardInstance, Square, Piece } from 'chessboardjs';
import $ from 'jquery';

declare const ChessBoard: any;

export class ChessApp {
    private chessBoard: ChessBoardInstance | null = null;
    private chessGame: Chess = new Chess();
    private engineWorker: Worker = new Worker(new URL('./engineWorker.ts', import.meta.url), { type: 'module' });
    public player: 'w' | 'b' = 'w';
    
    // UI/UX
    private clickedSquare: Square | null = null;
    private possibleTargets: Set<Square> | null = null;
    private highlightedMove: [Square, Square] | null = null;
    private _resizeHandler: (() => void) | null = null;
    
    private constructor() { }

    static async create(): Promise<ChessApp> {
        const app = new ChessApp();

        // Return a promise that resolves when the worker is ready
        await new Promise<void>((resolve) => {
            app.engineWorker.onmessage = (e) => {
                const { type, data } = e.data;

                if (type === 'ready') {
                    resolve();
                } else if (type === 'searchResult') {
                    app.update_search_data?.(data as SearchOutput);
                } else if (type === 'perftResult') {
                    app.update_perft_data?.(data as PerftOutput);
                } else if (type === 'enginePick') {
                    app.update_engine_pick?.(data as string);
                }
            };
            app.engineWorker.postMessage({ type: 'init' });
        });

        return app;
    }

    highlightSquare(square: Square, mainSquare: boolean = false) {
        const whiteHighlight = mainSquare ? '#f7f769': '#629d82ff';
        const blackHighlight = mainSquare ? '#bbca2c': '#4e7a65ff';
        const $square = ($('#myBoard .square-' + square));
        const background = $square.hasClass('black-3c85d') ? blackHighlight : whiteHighlight;
        $square.css('background', background);
    }

    removeMoveHighlights() {
        this.possibleTargets = null;

        // Remove highlight from all squares except those in this.highlightedMove
        const [from, to] = this.highlightedMove ?? [null, null];
        ($('#myBoard .square-55d63')).each(function () {
            const square = $(this).data('square');
            if (square !== from && square !== to) {
                $(this).css('background', '');
            }
        });
    }

    addMoveHighlights(square: Square, piece: Piece) {
        const moves = this.chessGame.moves({square: square, verbose: true});
        this.removeMoveHighlights();
        this.possibleTargets = new Set();

        this.highlightSquare(square, true);
        if (piece.charAt(0) === this.player) {
            for (let i = 0; i < moves.length; i++) {
                let tgt = (moves[i] as Move).to as Square;
                this.highlightSquare((moves[i] as Move).to as Square);
                this.possibleTargets.add(tgt);
            }
        }
    }

    updateBoardWithMove(from: Square, to: Square) {
        // Remove all highlights, including the last move
        this.clickedSquare = null;
        this.highlightedMove = null;
        this.removeMoveHighlights();
    
        // Highlight the move just made
        this.highlightedMove = [from, to];
        this.highlightSquare(from, true);
        this.highlightSquare(to, true);

        // Update the board position (assumes game is already updated)
        this.chessBoard!.position(this.chessGame.fen(), false);
        if (this.chessGame.isGameOver()) this.gameOver();
    }

    makePlayerMove(from: Square, to: Square) {
        if (!this.possibleTargets?.has(to)) return 'snapback';
        this.chessGame.move({ from, to, promotion: 'q' }); // default to queen promotion
        this.updateBoardWithMove(from, to);

        // Engine Reply
        const uciPosition = "fen " + this.chessGame.fen();
        const uciTc = "wtime 10000 btime 10000 winc 0 binc 0";
        this.engineWorker.postMessage({ type: 'search', data: { position: uciPosition, tc: uciTc } });
    }

    gameOver() {
        const sideToMove = this.chessGame.turn();
        console.log(sideToMove !== this.player ? "You win!" : "You lose!");
    }

    initChessUI() {
        const self = this;

        // SAFETY: All callbacks can assume chessBoard is initialized.
        function onSquareClick(square: Square) {
            if (self.clickedSquare === null) return;
            self.makePlayerMove(self.clickedSquare, square);

            // Clear highlights regardless of move success
            self.clickedSquare = null;
            self.removeMoveHighlights(); 
        }

        function onDragStart(source: Square, piece: Piece) {
            // Click-to-move: bypass onDragStart when the clicked square is a possible move.
            // This is needed because captures would not normally trigger onSquareClick()
            if (self.possibleTargets?.has(source)) onSquareClick(source);
            
            self.addMoveHighlights(source, piece);
        }
        
        function onDrop(source: Square, target: Square, piece: Piece) {
            // Click-to-move: click the same piece to deselect it.
            if (self.clickedSquare !== null && self.clickedSquare === target) {
                self.removeMoveHighlights();
                self.clickedSquare = null;
                return 'snapback';
            }

            self.clickedSquare = source; // Click-to-move: set clickedSquare only when dropping
            return self.makePlayerMove(source, target);
        }
        
        const config: BoardConfig = {
            draggable: true,
            dropOffBoard: 'snapback',
            position: 'start',
            pieceTheme: 'vendor/img/{piece}.svg',
            showNotation: false,
            // fix some broken types
            onDragStart: onDragStart as any,
            onDrop: onDrop as any,
        };

        this.chessGame.reset();
        this.chessBoard = ChessBoard('myBoard', config) as ChessBoardInstance;

        // Remove previous resize handler if it exists
        if (this._resizeHandler) {
            ($(window)).off('resize', this._resizeHandler);
        }
        this._resizeHandler = this.chessBoard.resize;
        ($(window)).on('resize', this._resizeHandler);

        ($('#myBoard .square-55d63')).on('click', function (this: HTMLElement) {
            const square = ($(this)).data('square');
            if (!square) return;
            onSquareClick(square);
        });

        if (self.player === 'b') {
            this.chessBoard.orientation('black');
        }
    }

    update_perft_data(data: PerftOutput) {
        console.log("Perft output:", data.nps);
    }

    update_search_data(data: SearchOutput) {
        console.log("Search output:", data.nps);
    }

    update_engine_pick(data: string) {
        if (!this.chessBoard) return;

        const move = this.chessGame.move(data);
        this.updateBoardWithMove(move.from as Square, move.to as Square);
    }
}

export const chessApp = await ChessApp.create();
