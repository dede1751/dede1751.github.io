import { SearchOutput, PerftOutput, Score, ScoreType } from '../carp-wasm/carp_wasm.js';
import { Chess, Move } from 'chess.js';
import type { BoardConfig, ChessBoardInstance, Square, Piece } from 'chessboardjs';
import $ from 'jquery';

declare const ChessBoard: any;

export class ChessApp {
    private chessBoard: ChessBoardInstance | null = null;
    private evalBar: EvalBar | null = null;
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
                    app.updateSearchData?.(data);
                } else if (type === 'perftResult') {
                    app.updatePerftData?.(data);
                } else if (type === 'enginePick') {
                    app.updateEnginePick?.(data);
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
        this.evalBar = new EvalBar('evalBar');

        const boardElem = document.getElementById('myBoard');
        const evalBar = document.getElementById('evalBar');
        if (boardElem && evalBar) {
            const boardRect = boardElem.getBoundingClientRect();
            evalBar.style.height = boardRect.height + 'px';
        }

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

    updatePerftData(data: any) { // PerftOutput-style data
        console.log("Perft output:", data.nps);
    }

    updateSearchData(data: any) { // SearchOutput-style data
        const [score_type, score] = this.getWhiteScore(data.score_type, data.score);
        this.evalBar?.updateEvaluation(score_type, score);
    }

    private getWhiteScore(score_type: string, score: Score): [string, Score] {
        if (this.player == 'b') return [score_type, score];

        console.log(score_type);

        if (score_type === 'Mate') score_type = 'Mated';
        else if (score_type === 'Mated') score_type = 'Mate';
        else score.val = -score.val;

        const [w, d, l] = [score.w, score.d, score.l];
        score.w = l; score.l = w;
        return [score_type, score];
    }

    updateEnginePick(data: string) {
        if (!this.chessBoard) return;

        const move = this.chessGame.move(data);
        this.updateBoardWithMove(move.from as Square, move.to as Square);
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

        this.blackDiv = this.container.querySelector('.eval-bar-black') as HTMLDivElement;
        this.whiteDiv = this.container.querySelector('.eval-bar-white') as HTMLDivElement;
        this.scoreDivWhite = this.container.querySelector('.eval-bar-score.white') as HTMLDivElement;
        this.scoreDivBlack = this.container.querySelector('.eval-bar-score.black') as HTMLDivElement;
    }

    updateEvaluation(scoreType: string, score: Score) {
        // Defaults
        let whiteHeight = 0.5; // percent (0-1)
        let displayText = "";
        let showWhite = true, showBlack = false;

        if (scoreType === "Cp") { // Cp: non-linear scale, leave room at top/bottom
            const evalCp = score.val / 100;
            const percent = evalToPercent(Math.abs(evalCp));
            const clippedPercent = Math.min(50 - this.minRoomPercent, percent);

            displayText = (evalCp > 0 ? "+" : "") + evalCp.toFixed(2);
            whiteHeight = (50 + (evalCp > 0 ? clippedPercent : -clippedPercent)) / 100;
            showWhite = true; showBlack = false;
        } else if (scoreType === "Mate") { // Mate
            whiteHeight = 1;
            displayText = `M${score.val}`;
            showWhite = true; showBlack = false;
        } else if (scoreType === "Mated") { // Mated
            whiteHeight = 0;
            displayText = `-M${score.val}`;
            showWhite = false; showBlack = true;
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
