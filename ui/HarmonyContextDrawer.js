// ui/HarmonyContextDrawer.js
// Collapsible post-answer drawer showing 2-3 matching chords and playable progressions

import { HarmonyFinder } from "../theory/HarmonyFinder.js?v=29";

export class HarmonyContextDrawer {
  constructor(containerEl, { onPlayChord, onPlayProgression } = {}) {
    this.container = containerEl;
    this.finder = new HarmonyFinder();
    this.callbacks = { onPlayChord, onPlayProgression };

    this.analysis = null;
    this.selectedChordIndex = 0;
    this.isOpen = false;
  }

  /**
   * Hides and resets the drawer whenever a new exercise begins
   */
  reset() {
    this.analysis = null;
    this.selectedChordIndex = 0;
    this.isOpen = false;
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.add("hidden");
    }
  }

  /**
   * Prepares harmonic analysis once the answer is revealed (keeps drawer collapsed until clicked)
   */
  prepareForExercise(exercise) {
    this.analysis = this.finder.analyzeExercise(exercise);
    this.selectedChordIndex = 0;
    this.isOpen = false;

    if (!this.analysis || this.analysis.chords.length === 0) {
      this.reset();
      return;
    }

    this.container.classList.remove("hidden");
    this._render();
  }

  _render() {
    if (!this.analysis || this.analysis.chords.length === 0) return;

    const activeChord = this.analysis.chords[this.selectedChordIndex];

    const chordChipsHtml = this.analysis.chords
      .map(
        (ch, idx) => `
        <button type="button"
                class="harmony-chord-chip ${idx === this.selectedChordIndex ? "active" : ""}"
                data-idx="${idx}">
          <strong>${ch.symbol}</strong> <span>(${ch.roman})</span>
        </button>`
      )
      .join("");

    const progressionsHtml = activeChord.progressions
      .map(
        (prog, pIdx) => `
        <div class="harmony-prog-row">
          <div class="harmony-prog-info">
            <span class="harmony-prog-roman">${prog.label}</span>
            <span class="harmony-prog-chords">
              ${prog.steps
                .map((s) => (s.isTarget ? `<strong>[${s.symbol}]</strong>` : s.symbol))
                .join(" → ")}
            </span>
          </div>
          <button type="button" class="secondary-btn harmony-play-prog" data-pidx="${pIdx}">
            ▶ Play Sequence
          </button>
        </div>`
      )
      .join("");

    this.container.innerHTML = `
      <div class="harmony-drawer">
        <button type="button" id="btn-toggle-harmony" class="harmony-toggle-btn">
          <span>${this.isOpen ? "▾" : "▸"} Explore in Chords & Progressions (${this.analysis.keyLabel})</span>
          <small>${this.analysis.chords.length} matching chord${this.analysis.chords.length > 1 ? "s" : ""}</small>
        </button>

        <div class="harmony-drawer-body ${this.isOpen ? "" : "hidden"}">
          <p class="harmony-hint">
            Tap a chord to hear & see both notes inside it, then play a cadence:
          </p>

          <div class="harmony-chord-list">${chordChipsHtml}</div>

          <div class="harmony-role-banner">
            <strong>${activeChord.symbol} (${activeChord.roman}):</strong> ${activeChord.roleDesc}
          </div>

          <div class="harmony-prog-list">${progressionsHtml}</div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const toggleBtn = this.container.querySelector("#btn-toggle-harmony");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.isOpen = !this.isOpen;
        this._render();
        // Auto-play the first matching chord when opening the drawer for immediate ear feedback
        if (this.isOpen && this.callbacks.onPlayChord) {
          const activeChord = this.analysis.chords[this.selectedChordIndex];
          this.callbacks.onPlayChord(activeChord);
        }
      });
    }

    this.container.querySelectorAll(".harmony-chord-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedChordIndex = Number(btn.dataset.idx);
        this._render();
        const activeChord = this.analysis.chords[this.selectedChordIndex];
        if (this.callbacks.onPlayChord) {
          this.callbacks.onPlayChord(activeChord);
        }
      });
    });

    this.container.querySelectorAll(".harmony-play-prog").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pIdx = Number(btn.dataset.pidx);
        const activeChord = this.analysis.chords[this.selectedChordIndex];
        const prog = activeChord.progressions[pIdx];
        if (prog && this.callbacks.onPlayProgression) {
          this.callbacks.onPlayProgression(prog);
        }
      });
    });
  }
}
