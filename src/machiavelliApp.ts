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
  private counts: number[][] = Array.from({ length: 4 }, () => Array(13).fill(0));
  private jokerCount: number = 0;

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
        const col = r + 1; // Ace=col1, ..., King=col13
        html +=
          `<div class="mach-card" data-suit="${s}" data-rank="${r}" ` +
          `style="background-position:${spritePos(col, row)}"></div>`;
      }
      html += "</div>";
    }
    html += '<div class="joker-row">';
    for (let j = 0; j < 4; j++) {
      html += `<div class="mach-card mach-joker" data-joker="${j}"></div>`;
    }
    html += "</div>";
    this.deck.innerHTML = html;
  }

  private toggleCard(el: HTMLDivElement) {
    const s = Number(el.dataset.suit);
    const r = Number(el.dataset.rank);
    this.counts[s][r] = (this.counts[s][r] + 1) % 3;
    el.classList.remove("selected", "selected-2");
    if (this.counts[s][r] >= 1) el.classList.add("selected");
    if (this.counts[s][r] === 2) el.classList.add("selected-2");
  }

  private toggleJoker(el: HTMLDivElement) {
    el.classList.toggle("selected");
    this.jokerCount += el.classList.contains("selected") ? 1 : -1;
  }

  private async solve() {
    await this.initWasm();

    const gs = new GameState();
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < 13; r++) {
        for (let c = 0; c < this.counts[s][r]; c++) {
          gs.add_card(new Card(RANKS[r], SUITS[s]));
        }
      }
    }
    for (let j = 0; j < this.jokerCount; j++) gs.add_card(Card.joker());

    const solution = gs.solve();
    this.displaySolution(solution);
    gs.free();
  }

  private clear() {
    this.counts = Array.from({ length: 4 }, () => Array(13).fill(0));
    this.jokerCount = 0;
    this.deck
      .querySelectorAll<HTMLDivElement>(".mach-card")
      .forEach((el) => el.classList.remove("selected", "selected-2"));
    this.solutionArea.innerHTML = "";
  }

  private displaySolution(solution: Solution | undefined) {
    if (!solution) {
      this.solutionArea.innerHTML =
        '<div class="mach-no-solution">No solution found.</div>';
      return;
    }

    const groups: { cards: { rank: string; suit: string }[] }[] =
      solution.asObject();
    let html = '<div class="repo-box mach-solution">';
    for (const group of groups) {
      html += '<div class="mach-group">';
      for (const card of group.cards) {
        if (card.rank === "Joker") {
          html += '<div class="mach-card mini mach-joker"></div>';
        } else {
          const col = RANK_NAME_COL[card.rank];
          const row = SUIT_NAME_ROW[card.suit];
          html +=
            `<div class="mach-card mini" ` +
            `style="background-position:${spritePos(col, row)}"></div>`;
        }
      }
      html += "</div>";
    }
    html += "</div>";
    this.solutionArea.innerHTML = html;
    solution.free();
  }
}
