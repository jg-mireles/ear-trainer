// ui/HarmonyContextDrawer.js
// Collapsible post-answer drawer showing 2-3 matching chords, playable SATB progressions,
// and a collapsible SATB voice-leading rule breakdown

import { HarmonyFinder } from "../theory/HarmonyFinder.js?v=30";

export class HarmonyContextDrawer {
  constructor(containerEl, { onPlayChord, onPlayProgression } = {}) {
    this.container = containerEl;
    this.finder = new HarmonyFinder();
    this.callbacks = { onPlayChord, onPlayProgression };

    this.analysis = null;
    this.selectedChordIndex = 0;
    this.activeProgIndex = 0;
    this.isOpen = false;
    this.showRules = false;
  }

  reset() {
    this.analysis = null;
    this.selectedChordIndex = 0;
    this.activeProgIndex = 0;
    this.isOpen = false;
    this.showRules = false;
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.add("hidden");
    }
  }

  prepareForExercise(exercise) {
    this.analysis = this.finder.analyzeExercise(exercise);
    this.selectedChordIndex = 0;
    this.activeProgIndex = 0;
    this.isOpen = false;
    this.showRules = false;

    if (!this.analysis || this.analysis.chords.length === 0) {
      this.reset();
      return;
    }

    this.container.classList.remove("hidden");
    this._render();
  }

  _buildRulesBreakdownHtml(prog) {
    if (!prog || !prog.steps || prog.steps.length < 2) {
      return `<p class="harmony-hint">Play a multi-chord sequence to inspect voice leading.</p>`;
    }

    const transitionsHtml = prog.steps
      .slice(1)
      .map((step, idx) => {
        const prev = prog.steps[idx];
        const tr = step.transition;
        if (!tr) return "";

        // Show Soprano -> Alto -> Tenor -> Bass top-to-bottom like a choral score
        const orderedVoices = [...tr.voiceExplanations].reverse();
        const rows = orderedVoices
          .map(
            (v) => `
            <li>
              <strong>${v.voice}:</strong> <code>${v.from} → ${v.to}</code>
              <span>(${v.reason})</span>
            </li>`
          )
          .join("");

        const checks = tr.ruleChecks.map((c) => `<span class="rule-badge">${c}</span>`).join(" ");

        return `
          <div class="satb-step-card">
            <div class="satb-step-title">
              Bar ${idx + 1} → Bar ${idx + 2}: <strong>${prev.symbol} (${prev.roman}) → ${step.symbol} (${step.roman})</strong>
            </div>
            <ul class="satb-voice-list">${rows}</ul>
            <div class="satb-checks">${checks}</div>
          </div>`;
      })
      .join("");

    return `
      <div class="satb-breakdown-box">
        <p class="harmony-hint" style="margin-bottom:8px;">
          Showing 4-part voice leading for <strong>${prog.label}</strong> (Soprano & Alto in Treble; Tenor & Bass in Bass):
        </p>
        ${transitionsHtml}
      </div>`;
  }

  _render() {
    if (!this.analysis || this.analysis.chords.length === 0) return;

    const activeChord = this.analysis.chords[this.selectedChordIndex];
    const activeProg =
      activeChord.progressions[this.activeProgIndex] || activeChord.progressions[0];

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
        <div class="harmony-prog-row ${pIdx === this.activeProgIndex ? "active-prog" : ""}">
          <div class="harmony-prog-info">
            <span class="harmony-prog-roman">${prog.label}</span>
            <span class="harmony-prog-chords">
              ${prog.steps
                .map((s) => (s.isTarget ? `<strong>[${s.symbol}]</strong>` : s.symbol))
                .join(" → ")}
            </span>
          </div>
          <button type="button" class="secondary-btn harmony-play-prog" data-pidx="${pIdx}">
            ▶ Play & Write Score
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
            Tap a chord to hear & see its 4-part voicing, then play a cadence to write all bars on the Grand Staff:
          </p>

          <div class="harmony-chord-list">${chordChipsHtml}</div>

          <div class="harmony-role-banner">
            <strong>${activeChord.symbol} (${activeChord.roman}):</strong> ${activeChord.roleDesc}
          </div>

          <div class="harmony-prog-list">${progressionsHtml}</div>

          <div style="margin-top: 10px;">
            <button type="button" id="btn-toggle-satb-rules" class="harmony-rules-toggle">
              ${this.showRules ? "▾" : "▸"} Voice-Leading Breakdown (SATB Rules Followed)
            </button>
            <div class="${this.showRules ? "" : "hidden"}">
              ${this._buildRulesBreakdownHtml(activeProg)}
            </div>
          </div>
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
        if (this.isOpen && this.callbacks.onPlayChord) {
          const activeChord = this.analysis.chords[this.selectedChordIndex];
          this.callbacks.onPlayChord(activeChord);
        }
      });
    }

    const rulesBtn = this.container.querySelector("#btn-toggle-satb-rules");
    if (rulesBtn) {
      rulesBtn.addEventListener("click", () => {
        this.showRules = !this.showRules;
        this._render();
      });
    }

    this.container.querySelectorAll(".harmony-chord-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedChordIndex = Number(btn.dataset.idx);
        this.activeProgIndex = 0;
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
        this.activeProgIndex = pIdx;
        this._render();
        const activeChord = this.analysis.chords[this.selectedChordIndex];
        const prog = activeChord.progressions[pIdx];
        if (prog && this.callbacks.onPlayProgression) {
          this.callbacks.onPlayProgression(prog);
        }
      });
    });
  }
}
