import wasmInit, {
  GameState,
  Card,
  Rank,
  Suit,
  type Solution,
} from "../wasmavelli-wasm/wasmavelli.js";

// Spritesheet: 14 cols × 4 rows (71×95 each)
// Rows: 0=Hearts, 1=Clubs, 2=Diamonds, 3=Spades
// Cols: 0=back, 1=Ace, 2=Two, ..., 13=King

const RANKS = [
  Rank.Ace, Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
  Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King,
];
const SUITS = [Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Hearts];

// Map our suit index (Spades=0,Clubs=1,Diamonds=2,Hearts=3) to sprite row
const SUIT_ROW = [3, 1, 2, 0];

// Map serde-serialized suit names to sprite rows
const SUIT_NAME_ROW: Record<string, number> = {
  Spades: 3, Clubs: 1, Diamonds: 2, Hearts: 0,
};

// Map serde-serialized rank names to sprite column (1-indexed: Ace=1, ..., King=13)
const RANK_NAME_COL: Record<string, number> = {
  Ace: 1, Two: 2, Three: 3, Four: 4, Five: 5, Six: 6, Seven: 7,
  Eight: 8, Nine: 9, Ten: 10, Jack: 11, Queen: 12, King: 13,
};

function spritePos(col: number, row: number): string {
  // background-size is 1400% 400%, so each cell = 100%/13 × 100%/3
  // percentage positioning: col/(14-1)*100, row/(4-1)*100
  const x = (col / 13) * 100;
  const y = (row / 3) * 100;
  return `${x.toFixed(4)}% ${y.toFixed(4)}%`;
}

export class MachiavelliApp {
  private wasmReady: Promise<void> | null = null;
  private boardCounts: number[][] = Array.from({ length: 4 }, () => Array(13).fill(0));
  private handCounts: number[][] = Array.from({ length: 4 }, () => Array(13).fill(0));
  private jokerTypes: ("board" | "hand" | null)[] = [null, null, null, null];
  private selectionMode: "board" | "hand" = "board";

  private deck: HTMLDivElement =
    document.getElementById("deck") as HTMLDivElement;
  private solutionArea: HTMLDivElement =
    document.getElementById("solutionArea") as HTMLDivElement;

  constructor() {
    this.buildDeck();

    this.deck.addEventListener("click", (e) => {
      const card = (e.target as HTMLElement).closest<HTMLDivElement>(".mach-card");
      if (!card) return;
      if (card.dataset.joker !== undefined) this.toggleJoker(card);
      else this.toggleCard(card);
    });

    // Card mode toggle (board / hand)
    const cardMode = document.getElementById("cardMode")!;
    const modeBtns = cardMode.querySelectorAll<HTMLButtonElement>(".mode-btn");
    cardMode.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".mode-btn");
      if (!btn) return;
      modeBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      this.selectionMode = btn.dataset.mode as "board" | "hand";
    });

    document.getElementById("solveBtn")!.addEventListener("click", () => this.solve());
    document.getElementById("clearBtn")!.addEventListener("click", () => this.clear());
  }

  initWasm() {
    if (!this.wasmReady) this.wasmReady = wasmInit().then(() => {});
    return this.wasmReady;
  }

  private buildDeck() {
    let html = "";
    for (let s = 0; s < 4; s++) {
      const row = SUIT_ROW[s];
      html += '<div class="suit-row">';
      for (let r = 0; r < 13; r++) {
        const col = r + 1;
        const jitter = MachiavelliApp.jitter(s * 13 + r);
        html +=
          `<div class="mach-card" data-suit="${s}" data-rank="${r}" ` +
          `style="background-position:${spritePos(col, row)};${jitter}"></div>`;
      }
      html += "</div>";
    }
    html += '<div class="joker-row">';
    for (let j = 0; j < 4; j++) {
      const jitter = MachiavelliApp.jitter(52 + j);
      html +=
        `<div class="mach-card mach-joker" data-joker="${j}" ` +
        `style="${jitter}"></div>`;
    }
    html += "</div>";
    this.deck.innerHTML = html;
  }

  private static jitter(seed: number): string {
    // Simple hash for deterministic per-card jitter
    const h = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    const r = (h - Math.floor(h)) * 2 - 1; // -1..1
    const h2 = Math.sin(seed * 269.5 + 183.3) * 43758.5453;
    const r2 = (h2 - Math.floor(h2)) * 2 - 1;
    const rot = (r * 3).toFixed(2);
    const ty = (r2 * 2.4).toFixed(2);
    return `--jitter:rotate(${rot}deg) translateY(${ty}px)`;
  }

  private toggleCard(el: HTMLDivElement) {
    const s = Number(el.dataset.suit);
    const r = Number(el.dataset.rank);
    const counts = this.selectionMode === "board" ? this.boardCounts : this.handCounts;
    const other = this.selectionMode === "board" ? this.handCounts : this.boardCounts;
    const max = 2 - other[s][r];
    counts[s][r] = (counts[s][r] + 1) % (max + 1);
    this.updateCardClasses(el, s, r);
  }

  private toggleJoker(el: HTMLDivElement) {
    const j = Number(el.dataset.joker);
    if (this.jokerTypes[j] === this.selectionMode) {
      this.jokerTypes[j] = null;
    } else {
      this.jokerTypes[j] = this.selectionMode;
    }
    this.updateJokerClasses(el, j);
  }

  private updateCardClasses(el: HTMLDivElement, s: number, r: number) {
    el.classList.remove("board-1", "board-2", "hand-1", "hand-2");
    const b = this.boardCounts[s][r];
    const h = this.handCounts[s][r];
    if (b >= 1) el.classList.add("board-1");
    if (b === 2) el.classList.add("board-2");
    if (h >= 1) el.classList.add("hand-1");
    if (h === 2) el.classList.add("hand-2");
  }

  private updateJokerClasses(el: HTMLDivElement, j: number) {
    el.classList.remove("board-1", "hand-1");
    if (this.jokerTypes[j] === "board") el.classList.add("board-1");
    else if (this.jokerTypes[j] === "hand") el.classList.add("hand-1");
  }

  private async solve() {
    await this.initWasm();

    const gs = new GameState();
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < 13; r++) {
        for (let c = 0; c < this.boardCounts[s][r]; c++)
          gs.add_board_card(new Card(RANKS[r], SUITS[s]));
        for (let c = 0; c < this.handCounts[s][r]; c++)
          gs.add_hand_card(new Card(RANKS[r], SUITS[s]));
      }
    }
    for (let j = 0; j < 4; j++) {
      if (this.jokerTypes[j] === "board") gs.add_board_card(Card.joker());
      else if (this.jokerTypes[j] === "hand") gs.add_hand_card(Card.joker());
    }

    const solution = gs.solve();
    this.displaySolution(solution);
    gs.free();
  }

  private clear() {
    this.boardCounts = Array.from({ length: 4 }, () => Array(13).fill(0));
    this.handCounts = Array.from({ length: 4 }, () => Array(13).fill(0));
    this.jokerTypes = [null, null, null, null];
    this.deck
      .querySelectorAll<HTMLDivElement>(".mach-card")
      .forEach((el) => el.classList.remove("board-1", "board-2", "hand-1", "hand-2"));
    this.solutionArea.innerHTML = "";
  }

  private displaySolution(solution: Solution | undefined) {
    if (!solution) {
      this.solutionArea.innerHTML =
        '<div class="mach-no-solution">No solution found.</div>';
      return;
    }

    const obj: {
      groups: { cards: { rank: string; suit: string }[] }[];
      remaining: { cards: { rank: string; suit: string }[] };
    } = solution.asObject();

    let html = '<div class="repo-box mach-solution">';
    for (const group of obj.groups) {
      html += '<div class="mach-group">';
      for (const card of group.cards) html += this.miniCardHTML(card);
      html += "</div>";
    }
    html += "</div>";

    if (obj.remaining.cards.length > 0) {
      html += '<div class="repo-box mach-remaining">';
      html += '<div class="mach-group">';
      for (const card of obj.remaining.cards) html += this.miniCardHTML(card);
      html += "</div></div>";
    }

    this.solutionArea.innerHTML = html;
    solution.free();
  }

  private miniCardHTML(card: { rank: string; suit: string }): string {
    if (card.rank === "Joker") {
      return '<div class="mach-card mini mach-joker"></div>';
    }
    const col = RANK_NAME_COL[card.rank];
    const row = SUIT_NAME_ROW[card.suit];
    return (
      `<div class="mach-card mini" ` +
      `style="background-position:${spritePos(col, row)}"></div>`
    );
  }
}
