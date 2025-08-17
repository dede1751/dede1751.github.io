interface Score {
  val: number;
  w: number;
  d: number;
  l: number;
}

function flipScore(score_type: string, score: Score): [string, Score] {
  if (score_type === "Mate") score_type = "Mated";
  else if (score_type === "Mated") score_type = "Mate";
  else score.val = -score.val;

  const [w, l] = [score.w, score.l];
  score.w = l;
  score.l = w;
  return [score_type, score];
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

export class EvalBar {
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

  updateEvaluation(scoreType: string, score: Score, flip: boolean = false) {
    if (flip) [scoreType, score] = flipScore(scoreType, score);

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
