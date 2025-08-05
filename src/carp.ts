import init, { CarpEngine, SearchOutput, PerftOutput } from '../carp-wasm/carp_wasm.js';
import { Chess, Move } from 'chess.js';
import type { BoardConfig, ChessBoardInstance, Square, Piece } from 'chessboardjs';
import $ from 'jquery';

declare const ChessBoard: any;

// Extend the Window interface for global callbacks
declare global {
    interface Window {
        update_perft_data: (data: any) => void;
        update_search_data: (data: any) => void;
        update_engine_pick: (data: any) => void;
    }
}

export class ChessApp {
    private _resizeHandler: (() => void) | null = null;
    public chessBoard: ChessBoardInstance | null = null;
    public chessGame: Chess | null = null;
    public clickedSquare: string | null = null;
    public player: 'w' | 'b' = 'w';
    public engine: CarpEngine | null = null;

    constructor() {
        // Initialize the Carp engine after loading module (not the UI)
        init().then(() => {
            this.engine = new CarpEngine();
        });
    }

    makePlayerMove(from: string, to: string) {
        if (!this.chessGame) return 'snapback';
        const move = this.chessGame.move({ from, to, promotion: 'q' });
        if (move == null) { return 'snapback'; }
        this.clickedSquare = null;
        this.makeOpponentMove();
    }

    makeOpponentMove() {
        if (!this.chessGame || this.chessGame.isGameOver()) return;

        const uciPosition = "fen " + this.chessGame.fen();
        const uciTc = "wtime 10000 btime 10000 winc 0 binc 0";
        this.engine?.search(uciPosition, uciTc);
    }

    initChessUI() {
        const self = this;

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
            if (!self.chessGame) return;
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
            if (!self.chessGame) return 'snapback';
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
            if (self.chessBoard && self.chessGame)
                self.chessBoard.position(self.chessGame.fen(), false);
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

        this.chessGame = new Chess();
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
        console.log("Engine pick:", data);
    }
}

export const chessApp = new ChessApp();

// Define global callbacks for Rust to call via wasm_bindgen externs
window.update_perft_data = (data: PerftOutput) => chessApp.update_perft_data(data);
window.update_search_data = (data: SearchOutput) => chessApp.update_search_data(data);
window.update_engine_pick = (data: string) => chessApp.update_engine_pick(data);
