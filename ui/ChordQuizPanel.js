// ui/ChordQuizPanel.js
// Self-contained UI & answer deck for Single Chords & Inversions with resolution rule breakdown

import { CHORD_TYPES, INVERSIONS } from "../theory/ChordQuizGenerator.js?v=33";

export class ChordQuizPanel {
  constructor(
    containerEl,
    { onNewChord, onRepeatChord, onRevealChord, onGuessChord, onPlayResolution } = {}
  ) {
    this.container = containerEl;
    this.callbacks = {
      onNewChord,
      onRepeatChord,
      onRevealChord,
      onGuessChord,
      onPlayResolution,
    };

    this.state = {
      allowedChords: new Set(["M", "m", "dim", "aug"]),
      allowedInversions: new Set([0]),
      playbackStyle: "harmonic",
      bpm: 90,
      showRules: false,
    };

    this.currentExercise = null;
    this._render();
    this._bindEvents();
  }

  getSnapshot() {
    return {
      allowedChords: Array.from(this.state.allowedChords),
      allowedInversions: Array.from(this.state.allowedInversions),
      playbackStyle: this.state.playbackStyle,
      stagger: 60 / this.state.bpm,
    };
  }

  _render() {
    const chordChips = CHORD_TYPES.map((c) => {
      const active = this.state.allowedChords.has(c.id) ? "selected" : "";
      return `<button type="button" class="interval-chip chord-chip ${active}" data-id="${c.id}">
        ${c.label}
      </button>`;
    }).join("");

    const invChips = INVERSIONS.map((inv) => {
      const active = this.state.allowedInversions.has(inv.id) ? "selected" : "";
      return `<button type="button" class="interval-chip inv-chip ${active}" data-id="${inv.id}">
        ${inv.label}
      </button>`;
    }).join("");

    const answerButtons = CHORD_TYPES.map(
      (c) => `<button type="button" class="quiz-btn chord-ans-btn" data-id="${c.id}">${c.label}</button>`
    ).join("");

    this.container.innerHTML = `
      <div class="panel-card">
        <div class="section-header">
          <h2>1. Single Chord & Inversion Settings</h2>
        </div>

        <div class="controls-grid">
          <label>
            <span>Playback Style</span>
            <select id="chord-playback-style">
              <option value="harmonic" selected>Block Chord (Simultaneous)</option>
              <option value="arp-up">Arpeggiated Up (Low → High)</option>
              <option value="arp-down">Arpeggiated Down (High → Low)</option>
            </select>
          </label>

          <label>
            <span>Arpeggio Tempo: <strong id="chord-bpm-val">${this.state.bpm}</strong> BPM</span>
            <input id="chord-bpm-slider" type="range" min="40" max="200" value="${this.state.bpm}" />
          </label>

          <div class="interval-filter-box">
            <div class="interval-filter-header">
              <span>Active Chord Qualities (<strong id="chord-active-count">${this.state.allowedChords.size}</strong>/${CHORD_TYPES.length})</span>
              <div class="filter-quick-btns">
                <button type="button" id="chords-triads" class="mini-btn">Triads</button>
                <button type="button" id="chords-7ths" class="mini-btn">7ths</button>
                <button type="button" id="chords-all" class="mini-btn">All</button>
              </div>
            </div>
            <div class="interval-chips">${chordChips}</div>
          </div>

          <div class="interval-filter-box">
            <div class="interval-filter-header">
              <span>Allowed Inversions</span>
            </div>
            <div class="interval-chips">${invChips}</div>
          </div>
        </div>

        <div class="action-row">
          <button type="button" id="btn-new-chord" class="primary-btn">New Chord</button>
          <button type="button" id="btn-repeat-chord" class="secondary-btn">Repeat Chord</button>
          <button type="button" id="btn-reveal-chord" class="secondary-btn">Reveal on Staff</button>
        </div>
      </div>

      <section class="panel-card">
        <div class="section-header">
          <h2>2. Identify the Chord Quality</h2>
        </div>
        <div id="chord-quiz-grid" class="quiz-grid">${answerButtons}</div>
        <p id="chord-feedback-text">Click "New Chord" to begin.</p>

        <div style="margin-top: 10px;">
          <button type="button" id="btn-resolve-chord" class="primary-btn hidden">
            Resolve Chord to Tonic
          </button>
        </div>

        <!-- Collapsible Resolution Voice-Leading Rules Drawer -->
        <div id="chord-resolution-rules-wrap" class="hidden" style="margin-top: 12px;">
          <button type="button" id="btn-toggle-chord-rules" class="harmony-rules-toggle">
            ▸ Resolution Voice-Leading Breakdown (Rules Followed)
          </button>
          <div id="chord-resolution-rules-body" class="hidden"></div>
        </div>
      </section>
    `;
  }

  _syncChips() {
    const countEl = this.container.querySelector("#chord-active-count");
    if (countEl) countEl.textContent = this.state.allowedChords.size;

    this.container.querySelectorAll(".chord-chip").forEach((chip) => {
      chip.classList.toggle("selected", this.state.allowedChords.has(chip.dataset.id));
    });

    this.container.querySelectorAll(".inv-chip").forEach((chip) => {
      chip.classList.toggle("selected", this.state.allowedInversions.has(Number(chip.dataset.id)));
    });
  }

  _renderResolutionRules(exercise) {
    const wrap = this.container.querySelector("#chord-resolution-rules-wrap");
    const toggleBtn = this.container.querySelector("#btn-toggle-chord-rules");
    const body = this.container.querySelector("#chord-resolution-rules-body");

    if (!exercise || !exercise.resolution) {
      wrap.classList.add("hidden");
      return;
    }

    const res = exercise.resolution;
    const orderedVoices = [...res.voiceExplanations].reverse(); // Top voice -> Bass
    const rows = orderedVoices
      .map(
        (v) => `
        <li>
          <strong>${v.voice}:</strong> <code>${v.from} → ${v.to}</code>
          <span>(${v.reason})</span>
        </li>`
      )
      .join("");

    const checks = res.ruleChecks.map((c) => `<span class="rule-badge">${c}</span>`).join(" ");

    toggleBtn.textContent = `${this.state.showRules ? "▾" : "▸"} Resolution Voice-Leading Breakdown (Rules Followed)`;
    body.classList.toggle("hidden", !this.state.showRules);
    body.innerHTML = `
      <div class="satb-breakdown-box">
        <div class="satb-step-card">
          <div class="satb-step-title">
            Resolution: <strong>${exercise.slashSymbol} (${exercise.chordDef.label}) → ${res.label}</strong>
          </div>
          <ul class="satb-voice-list">${rows}</ul>
          <div class="satb-checks">${checks}</div>
        </div>
      </div>
    `;

    wrap.classList.remove("hidden");
  }

  _bindEvents() {
    const q = (sel) => this.container.querySelector(sel);

    q("#chord-playback-style").addEventListener("change", (e) => {
      this.state.playbackStyle = e.target.value;
    });

    q("#chord-bpm-slider").addEventListener("input", (e) => {
      this.state.bpm = Number(e.target.value);
      q("#chord-bpm-val").textContent = this.state.bpm;
    });

    this.container.querySelectorAll(".chord-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.id;
        if (this.state.allowedChords.has(id) && this.state.allowedChords.size > 1) {
          this.state.allowedChords.delete(id);
        } else {
          this.state.allowedChords.add(id);
        }
        this._syncChips();
      });
    });

    this.container.querySelectorAll(".inv-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const inv = Number(chip.dataset.id);
        if (this.state.allowedInversions.has(inv) && this.state.allowedInversions.size > 1) {
          this.state.allowedInversions.delete(inv);
        } else {
          this.state.allowedInversions.add(inv);
        }
        this._syncChips();
      });
    });

    q("#chords-triads").addEventListener("click", () => {
      this.state.allowedChords = new Set(CHORD_TYPES.filter((c) => c.category === "triad").map((c) => c.id));
      this._syncChips();
    });

    q("#chords-7ths").addEventListener("click", () => {
      this.state.allowedChords = new Set(CHORD_TYPES.filter((c) => c.category === "seventh").map((c) => c.id));
      this._syncChips();
    });

    q("#chords-all").addEventListener("click", () => {
      this.state.allowedChords = new Set(CHORD_TYPES.map((c) => c.id));
      this._syncChips();
    });

    q("#btn-new-chord").addEventListener("click", () => {
      if (this.callbacks.onNewChord) this.callbacks.onNewChord(this.getSnapshot());
    });

    q("#btn-repeat-chord").addEventListener("click", () => {
      if (this.callbacks.onRepeatChord) this.callbacks.onRepeatChord(this.getSnapshot());
    });

    q("#btn-reveal-chord").addEventListener("click", () => {
      if (this.callbacks.onRevealChord) this.callbacks.onRevealChord();
    });

    q("#btn-resolve-chord").addEventListener("click", () => {
      // Automatically expand the rules breakdown when you resolve the chord
      this.state.showRules = true;
      if (this.currentExercise) this._renderResolutionRules(this.currentExercise);
      if (this.callbacks.onPlayResolution) this.callbacks.onPlayResolution();
    });

    q("#btn-toggle-chord-rules").addEventListener("click", () => {
      this.state.showRules = !this.state.showRules;
      if (this.currentExercise) this._renderResolutionRules(this.currentExercise);
    });

    this.container.querySelectorAll(".chord-ans-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.callbacks.onGuessChord) this.callbacks.onGuessChord(btn.dataset.id, btn);
      });
    });
  }

  resetFeedback(text = "Listen and identify the chord quality...") {
    this.currentExercise = null;
    this.state.showRules = false;
    this.container.querySelectorAll(".chord-ans-btn").forEach((btn) => {
      btn.classList.remove("correct", "wrong");
    });
    this.container.querySelector("#chord-feedback-text").textContent = text;
    this.container.querySelector("#btn-resolve-chord").classList.add("hidden");
    this.container.querySelector("#chord-resolution-rules-wrap").classList.add("hidden");
  }

  showReveal(exercise) {
    this.currentExercise = exercise;
    this.container.querySelector("#chord-feedback-text").textContent =
      `Answer: ${exercise.chordDef.label} — ${exercise.slashSymbol} (${exercise.inversionLabel}: ${exercise.voicedNotes.join(" – ")})`;

    const correctBtn = this.container.querySelector(`.chord-ans-btn[data-id="${exercise.chordDef.id}"]`);
    if (correctBtn) correctBtn.classList.add("correct");

    const resBtn = this.container.querySelector("#btn-resolve-chord");
    if (exercise.resolution) {
      resBtn.textContent = `Resolve to ${exercise.resolution.label}`;
      resBtn.classList.remove("hidden");
      this._renderResolutionRules(exercise);
    } else {
      resBtn.classList.add("hidden");
      this.container.querySelector("#chord-resolution-rules-wrap").classList.add("hidden");
    }
  }

  markWrong(btn) {
    btn.classList.add("wrong");
    this.container.querySelector("#chord-feedback-text").textContent =
      `Not quite (${btn.textContent}). Listen again or click Reveal on Staff.`;
  }
}
