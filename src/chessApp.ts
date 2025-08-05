import type { SearchOutput, PerftOutput } from '../carp-wasm/carp_wasm.js';
import { Chess, Move } from 'chess.js';
import type { BoardConfig, ChessBoardInstance, Square, Piece } from 'chessboardjs';
import $ from 'jquery';

declare const ChessBoard: any;

export class ChessApp {
    public player: 'w' | 'b' = 'w';
    private _resizeHandler: (() => void) | null = null;
    private chessBoard: ChessBoardInstance | null = null;
    private chessGame: Chess = new Chess();
    private clickedSquare: string | null = null;
    private engineWorker: Worker = new Worker(new URL('./engineWorker.ts', import.meta.url), { type: 'module' });

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

    makePlayerMove(from: string, to: string) {
        const move = this.chessGame.move({ from, to, promotion: 'q' });
        if (move == null) { return 'snapback'; }
        this.clickedSquare = null;
        if (this.chessGame.isGameOver()) this.gameOver(true);

        const uciPosition = "fen " + this.chessGame.fen();
        const uciTc = "wtime 10000 btime 10000 winc 0 binc 0";
        this.engineWorker.postMessage({ type: 'search', data: { position: uciPosition, tc: uciTc } });
    }

    gameOver(playerWon: boolean) {
        console.log(playerWon ? "You win!" : "You lose!");
    }

    initChessUI() {
        const self = this;

        // SAFETY: All callbacks can assume chessBoard is initialized.
        function removeHighlightSquares() {
            ($('#myBoard .square-55d63')).css('background', '');
        }

        function highlightSquare(square: string) {
            const whiteHighlight = '#629d82ff';
            const blackHighlight = '#4e7a65ff';
            const $square = ($('#myBoard .square-' + square));
            const background = $square.hasClass('black-3c85d') ? blackHighlight : whiteHighlight;
            $square.css('background', background);
        }

        function onMouseoverSquare(square: Square, piece: string) {
            if (self.clickedSquare !== null) return;
            const moves = self.chessGame.moves({
                square: square,
                verbose: true
            });
            if (moves.length === 0) return;
            highlightSquare(square);
            for (let i = 0; i < moves.length; i++) {
                highlightSquare((moves[i] as Move).to);
            }
        }

        function onMouseoutSquare(square: string, piece: string) {
            if (self.clickedSquare === null) removeHighlightSquares();
        }

        function onSquareClick(square: string) {
            if (self.clickedSquare === null) return;
            if (self.clickedSquare === square) {
                self.clickedSquare = null;
                removeHighlightSquares();
                return;
            }
            self.makePlayerMove(self.clickedSquare, square);
        }

        function onDrop(source: Square, target: Square, piece: Piece) {
            const pieceColor = piece.charAt(0);
            if (self.chessGame.isGameOver()) return 'snapback';
            if (pieceColor !== self.player || self.player !== self.chessGame.turn()) return 'snapback';
            if (source == target) {
                self.clickedSquare = source;
                removeHighlightSquares();
                onMouseoverSquare(source, null as any);
                return 'snapback';
            }
            return self.makePlayerMove(source, target);
        }

        function onSnapEnd() {
            self.chessBoard!.position(self.chessGame!.fen(), false);
            removeHighlightSquares();
        }

        const config: BoardConfig = {
            draggable: true,
            dropOffBoard: 'snapback',
            position: 'start',
            pieceTheme: 'vendor/img/{piece}.png',
            showNotation: false,
            // fix some broken types
            onDrop: onDrop as any,
            onSnapEnd: onSnapEnd as any,
            onMouseoverSquare: onMouseoverSquare as any,
            onMouseoutSquare: onMouseoutSquare as any
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

        console.log("Engine pick:", data);
        this.chessGame.move(data);
        this.chessBoard.position(this.chessGame.fen(), false);
        if (this.chessGame.isGameOver()) this.gameOver(false);
    }
}

export const chessApp = await ChessApp.create();
