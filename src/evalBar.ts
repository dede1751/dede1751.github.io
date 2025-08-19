export enum ScoreType {
  WDL,
  CP,
}

export interface Score {
  val: number;
  w: number;
  d: number;
  l: number;
}

export class EvalBar {
  private scoreType: ScoreType;

  private container: HTMLElement;
  private whiteDiv: HTMLDivElement;
  private greyDiv: HTMLDivElement;
  private blackDiv: HTMLDivElement;
  private scoreDivWhite: HTMLDivElement;
  private scoreDivGrey: HTMLDivElement;
  private scoreDivBlack: HTMLDivElement;

  // Margin for text at top/bottom (as percent of bar height)
  private readonly minRoomPercent = 5; // 10%

  constructor(containerId: string, scoreType: ScoreType) {
    this.scoreType = scoreType;
    this.container = document.getElementById(containerId)!;

    // Build the eval bar HTML structure
    this.container.innerHTML = `
      <div class="eval-bar-outer" style="height: 100%;">
        <div class="eval-bar-black">
          <div class="eval-bar-score black" style="display:none"></div>
        </div>
        <div class="eval-bar-grey">
          <div class="eval-bar-score grey" style="display:none"></div>
        </div>
        <div class="eval-bar-white">
          <div class="eval-bar-score white" style="display:none"></div>
        </div>
      </div>
    `;

    this.whiteDiv =
      this.container.querySelector<HTMLDivElement>(".eval-bar-white")!;
    this.greyDiv =
      this.container.querySelector<HTMLDivElement>(".eval-bar-grey")!;
    this.blackDiv =
      this.container.querySelector<HTMLDivElement>(".eval-bar-black")!;
    this.scoreDivWhite = this.container.querySelector<HTMLDivElement>(
      ".eval-bar-score.white",
    )!;
    this.scoreDivGrey = this.container.querySelector<HTMLDivElement>(
      ".eval-bar-score.grey",
    )!;
    this.scoreDivBlack = this.container.querySelector<HTMLDivElement>(
      ".eval-bar-score.black",
    )!;
  }

  reset() {
    if (this.scoreType === ScoreType.CP) {
      this.whiteDiv.style.height = "50%";
      this.greyDiv.style.display = "none";
      this.blackDiv.style.height = "50%";
    } else {
      this.whiteDiv.style.height = "33%";
      this.greyDiv.style.height = "34%";
      this.blackDiv.style.height = "33%";
    }

    this.scoreDivWhite.style.display = "none";
    this.scoreDivGrey.style.display = "none";
    this.scoreDivBlack.style.display = "none";
  }

  setHeight(height: string) {
    this.container.style.height = height;
  }

  updateEvaluation(scoreType: string, score: Score, flip: boolean = false) {
    function flipScore(scoreType: string, score: Score): [string, Score] {
      let newScoreType = scoreType;
      let newScore = { val: score.val, w: score.l, d: score.d, l: score.w };

      if (newScoreType === "Mate") newScoreType = "Mated";
      else if (newScoreType === "Mated") newScoreType = "Mate";
      else newScore.val = -newScore.val;

      return [newScoreType, newScore];
    }

    if (flip) {
      [scoreType, score] = flipScore(scoreType, score);
    }

    if (this.scoreType === ScoreType.CP) this.updateEvalCP(scoreType, score);
    else this.updateEvalWDL(score);
  }

  private updateEvalCP(scoreType: string, score: Score) {
    // Defaults
    var whiteHeight = 0.5; // percent (0-1)
    var displayText = "";
    var showWhite = true,
      showBlack = false;

    if (scoreType === "Cp") {
      // From: https://github.com/trevor-ofarrell/chess-evaluation-bar/blob/main/src/lib/components/EvalBar.js
      // Carp eval is actually already passed through a WDL model for normalization, but this looks good...
      function evalToPercent(x: number): number {
        if (x === 0) {
          return 0;
        } else if (x < 7) {
          return -(0.322495 * Math.pow(x, 2)) + 7.26599 * x + 4.11834;
        } else {
          return (8 * x) / 145 + 5881 / 145;
        }
      }

      const evalCp = score.val / 100;
      const percent = evalToPercent(Math.abs(evalCp));
      const clippedPercent = Math.min(50 - this.minRoomPercent, percent);

      if (Math.abs(evalCp) < 0.1) {
        displayText = "0.0";
      } else {
        displayText = (evalCp > 0 ? "+" : "") + evalCp.toFixed(1);
      }

      whiteHeight =
        (50 + (evalCp > 0 ? clippedPercent : -clippedPercent)) / 100;
      showWhite = true;
      showBlack = false;
    } else if (scoreType === "Mate") {
      whiteHeight = 1;
      displayText = `M${score.val}`;
      showWhite = true;
      showBlack = false;
    } else if (scoreType === "Mated") {
      whiteHeight = 0;
      displayText = `-M${score.val}`;
      showWhite = false;
      showBlack = true;
    }

    // Set heights
    this.whiteDiv.style.height = `${whiteHeight * 100}%`;
    this.blackDiv.style.height = `${(1 - whiteHeight) * 100}%`;

    // Display cp score
    this.scoreDivWhite.style.display = showWhite ? "block" : "none";
    this.scoreDivBlack.style.display = showBlack ? "block" : "none";
    if (showWhite) {
      this.scoreDivWhite.textContent = displayText;
      this.scoreDivWhite.style.top = "2px";
    }
    if (showBlack) {
      this.scoreDivBlack.textContent = displayText;
      this.scoreDivBlack.style.bottom = "2px";
    }
  }

  private updateEvalWDL(score: Score) {
    const [wp, dp, lp] = [score.w / 10, score.d / 10, score.l / 10];

    // Set heights
    this.whiteDiv.style.height = `${wp}%`;
    this.greyDiv.style.height = `${dp}%`;
    this.blackDiv.style.height = `${lp}%`;

    const showWhite = wp > this.minRoomPercent;
    const showGrey = dp > this.minRoomPercent;
    const showBlack = lp > this.minRoomPercent;

    // Display percentages
    this.scoreDivWhite.style.display = showWhite ? "block" : "none";
    this.scoreDivGrey.style.display = showGrey ? "block" : "none";
    this.scoreDivBlack.style.display = showBlack ? "block" : "none";

    if (showWhite) {
      const wps: string = wp === 100 ? "100" : wp.toFixed(1);
      this.scoreDivWhite.textContent = `${wps}%`;
    }
    if (showGrey) {
      const dps: string = dp === 100 ? "100" : dp.toFixed(1);
      this.scoreDivGrey.textContent = `${dps}%`;
    }
    if (showBlack) {
      const lps: string = lp === 100 ? "100" : lp.toFixed(1);
      this.scoreDivBlack.textContent = `${lps}%`;
    }
  }
}
