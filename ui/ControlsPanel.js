// ui/ControlsPanel.js
// Manages Training Controls, Key/Scale Selection, Multi-Interval Toggle Deck, Fixed/Random Root, BPM, and Harmonic Rack

import { INTERVALS, ROOT_POOL, KEY_TONICS, SCALE_TYPES } from "../theory/IntervalGenerator.js?v=18";

const SYNTH_PRESETS = {
  warm: {
    harmonics: [1.0, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01],
    inharmonicity: 0.0,
    highDecayRate: 0.5,
  },
  sine: {
    harmonics: [1.0, 0, 0, 0, 0, 0, 0, 0],
    inharmonicity: 0.0,
    highDecayRate: 0.0,
  },
  clarinet: {
    harmonics: [1.0, 0.02, 0.75, 0.02, 0.5, 0.02, 0.3, 0.02],
    inharmonicity: 0.0,
    highDecayRate: 0.2,
  },
  stretched: {
    harmonics: [1.0, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1, 0.08],
    inharmonicity: 0.0025,
    highDecayRate: 0.7,
  },
  bell: {
    harmonics: [0.8, 0.2, 0.9, 0.1, 0.7, 0.4, 0.6, 0.3],
    inharmonicity: 0.045,
    highDecayRate: 0.4,
  },
};

export class ControlsPanel {
  constructor(
    containerEl,
    synthEngine,
    { onNewExercise, onRepeat, onReveal, onModeChange, onTuningChange, onKeyChange } = {}
  ) {
    this.container = containerEl;
    this.synth = synthEngine;
    this.callbacks = {
      onNewExercise,
      onRepeat,
      onReveal,
      onModeChange,
      onTuningChange,
      onKeyChange,
    };

    this.state = {
      keyTonic: "none",
      scaleType: "major",
      allowedIntervals: new Set(INTERVALS.map((i) => i.id)),
      rootNote: "random",
      direction: "ascending",
      bpm: 90,
      metronomeClick: false,
      soundMode: "easy",
      tuning: "12-TET",
    };

    this._render();
    this._bindEvents();
  }

  getStaggerSeconds() {
    return 60 / this.state.bpm;
  }

  _getSnapshotState() {
    return {
      ...this.state,
      allowedIntervals: Array.from(this.state.allowedIntervals),
      stagger: this.getStaggerSeconds(),
    };
  }

  // --- SECTION A: HTML Template ---

  _render() {
    const keyOptions = [
      `<option value="none">Any Key (Chromatic)</option>`,
      ...KEY_TONICS.map((k) => `<option value="${k}">Key of ${k}</option>`),
    ].join("");

    const scaleOptions = SCALE_TYPES.map(
      (s) => `<option value="${s.id}">${s.label}</option>`
    ).join("");

    const intervalChips = INTERVALS.map(
      (int) => `
        <button type="button" class="interval-chip selected" data-id="${int.id}" title="${int.name}">
          ${int.name} (${int.id})
        </button>`
    ).join("");

    const rootOptions = [
      `<option value="random">Random (Truly Random)</option>`,
      ...ROOT_POOL.map(
        (note) => `<option value="${note}">Fixed: ${note}</option>`
      ),
    ].join("");

    const harmonicSliders = this.synth.params.harmonics
      .map(
        (val, idx) => `
        <div class="harmonic-col">
          <input type="range" class="harm-slider" data-index="${idx}"
                 min="0" max="1" step="0.01" value="${val}" />
          <span>H${idx + 1}</span>
        </div>`
      )
      .join("");

    this.container.innerHTML = `
      <div class="panel-card">
        <div class="section-header">
          <h2>1. Exercise & Tempo Settings</h2>
          <div class="mode-toggle">
            <button type="button" id="mode-easy" class="active">Easy (Piano)</button>
            <button type="button" id="mode-hard">Hard (Synth Lab)</button>
          </div>
        </div>

        <div class="controls-grid">
          <label>
            <span>Key / Scale Constraint</span>
            <div style="display: flex; gap: 6px;">
              <select id="key-select" style="flex: 1;">${keyOptions}</select>
              <select id="scale-select" style="flex: 1.2;" disabled>${scaleOptions}</select>
            </div>
          </label>

          <label>
            <span>First Note (Anchor)</span>
            <select id="root-select">${rootOptions}</select>
          </label>

          <label>
            <span>Playback Order</span>
            <select id="direction-select">
              <option value="harmonic">Same Time (Harmonic)</option>
              <option value="ascending" selected>Lower → Higher</option>
              <option value="descending">Higher → Lower</option>
            </select>
          </label>

          <label>
            <span>Metronome Tempo: <strong id="bpm-val">${this.state.bpm}</strong> BPM</span>
            <input id="bpm-slider" type="range" min="40" max="200" value="${this.state.bpm}" />
            <small class="checkbox-row">
              <input type="checkbox" id="click-toggle" /> Play 2-beat count-in click
            </small>
          </label>

          <!-- Multi-Select Interval Pool -->
          <div class="interval-filter-box">
            <div class="interval-filter-header">
              <span>Active Intervals (<strong id="active-count">${INTERVALS.length}</strong>/${INTERVALS.length})</span>
              <div class="filter-quick-btns">
                <button type="button" id="intervals-all" class="mini-btn">All</button>
                <button type="button" id="intervals-none" class="mini-btn">None</button>
              </div>
            </div>
            <div id="interval-chips" class="interval-chips">${intervalChips}</div>
          </div>
        </div>

        <div class="action-row">
          <button type="button" id="btn-new" class="primary-btn">New Interval</button>
          <button type="button" id="btn-repeat" class="secondary-btn">Repeat Audio</button>
          <button type="button" id="btn-reveal" class="secondary-btn">Reveal on Staff</button>
        </div>
      </div>

      <!-- Hard Mode: Additive Synthesis Rack -->
      <div id="synth-rack" class="panel-card hidden">
        <div class="section-header">
          <h2>2. Harmonic & Acoustic Physics Lab</h2>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <select id="tuning-select" aria-label="Tuning System">
              <option value="12-TET">Tuning: 12-TET (Equal)</option>
              <option value="JUST">Tuning: Just Intonation (Pure)</option>
              <option value="PYTHAGOREAN">Tuning: Pythagorean (3:2)</option>
            </select>
            <select id="preset-select" aria-label="Timbre Presets">
              <option value="warm">Preset: Warm Saw-ish</option>
              <option value="sine">Preset: Pure Sine (Fundamental Only)</option>
              <option value="clarinet">Preset: Odd Harmonics (Clarinet)</option>
              <option value="stretched">Preset: Stretched String (Inharmonic)</option>
              <option value="bell">Preset: Metallic Bell</option>
            </select>
          </div>
        </div>

        <div class="harmonics-rack">${harmonicSliders}</div>

        <div class="physics-grid">
          <label>
            <span>Inharmonicity Stretch (B): <strong id="stretch-val">${this.synth.params.inharmonicity}</strong></span>
            <input id="stretch-slider" type="range" min="0" max="0.05" step="0.0005"
                   value="${this.synth.params.inharmonicity}" />
          </label>

          <label>
            <span>High-Harmonic Decay: <strong id="decay-val">${this.synth.params.highDecayRate}</strong></span>
            <input id="decay-slider" type="range" min="0" max="1" step="0.05"
                   value="${this.synth.params.highDecayRate}" />
          </label>
        </div>
      </div>
    `;
  }

  // --- SECTION B: Event Bindings ---

  _syncIntervalChipsUI() {
    const countEl = this.container.querySelector("#active-count");
    if (countEl) countEl.textContent = this.state.allowedIntervals.size;

    this.container.querySelectorAll(".interval-chip").forEach((chip) => {
      const isSelected = this.state.allowedIntervals.has(chip.dataset.id);
      chip.classList.toggle("selected", isSelected);
    });
  }

  _bindEvents() {
    const q = (sel) => this.container.querySelector(sel);

    q("#mode-easy").addEventListener("click", () => this._setSoundMode("easy"));
    q("#mode-hard").addEventListener("click", () => this._setSoundMode("hard"));

    const notifyKeyChange = () => {
      if (this.callbacks.onKeyChange) {
        this.callbacks.onKeyChange(this.state.keyTonic, this.state.scaleType);
      }
    };

    q("#key-select").addEventListener("change", (e) => {
      this.state.keyTonic = e.target.value;
      q("#scale-select").disabled = this.state.keyTonic === "none";
      notifyKeyChange();
    });

    q("#scale-select").addEventListener("change", (e) => {
      this.state.scaleType = e.target.value;
      notifyKeyChange();
    });

    q("#root-select").addEventListener("change", (e) => {
      this.state.rootNote = e.target.value;
    });

    // Multi-select interval chip toggles
    this.container.querySelectorAll(".interval-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.id;
        if (this.state.allowedIntervals.has(id)) {
          this.state.allowedIntervals.delete(id);
        } else {
          this.state.allowedIntervals.add(id);
        }
        this._syncIntervalChipsUI();
      });
    });

    q("#intervals-all").addEventListener("click", () => {
      this.state.allowedIntervals = new Set(INTERVALS.map((i) => i.id));
      this._syncIntervalChipsUI();
    });

    q("#intervals-none").addEventListener("click", () => {
      this.state.allowedIntervals.clear();
      this._syncIntervalChipsUI();
    });

    q("#direction-select").addEventListener("change", (e) => {
      this.state.direction = e.target.value;
    });

    q("#bpm-slider").addEventListener("input", (e) => {
      this.state.bpm = Number(e.target.value);
      q("#bpm-val").textContent = this.state.bpm;
    });

    q("#click-toggle").addEventListener("change", (e) => {
      this.state.metronomeClick = e.target.checked;
    });

    q("#btn-new").addEventListener("click", () => {
      // Auto-reselect all if user cleared everything before hitting New Interval
      if (this.state.allowedIntervals.size === 0) {
        this.state.allowedIntervals = new Set(INTERVALS.map((i) => i.id));
        this._syncIntervalChipsUI();
      }
      if (this.callbacks.onNewExercise) {
        this.callbacks.onNewExercise(this._getSnapshotState());
      }
    });

    q("#btn-repeat").addEventListener("click", () => {
      if (this.callbacks.onRepeat) {
        this.callbacks.onRepeat(this._getSnapshotState());
      }
    });

    q("#btn-reveal").addEventListener("click", () => {
      if (this.callbacks.onReveal) this.callbacks.onReveal();
    });

    q("#tuning-select").addEventListener("change", (e) => {
      this.state.tuning = e.target.value;
      if (this.callbacks.onTuningChange) {
        this.callbacks.onTuningChange(e.target.value);
      }
    });

    this.container.querySelectorAll(".harm-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        this.synth.setHarmonic(idx, Number(e.target.value));
      });
    });

    q("#stretch-slider").addEventListener("input", (e) => {
      const val = Number(e.target.value);
      this.synth.setInharmonicity(val);
      q("#stretch-val").textContent = val;
    });

    q("#decay-slider").addEventListener("input", (e) => {
      const val = Number(e.target.value);
      this.synth.setHighDecayRate(val);
      q("#decay-val").textContent = val;
    });

    q("#preset-select").addEventListener("change", (e) => {
      const preset = SYNTH_PRESETS[e.target.value];
      if (!preset) return;

      preset.harmonics.forEach((amp, idx) => {
        this.synth.setHarmonic(idx, amp);
        const slider = this.container.querySelector(`.harm-slider[data-index="${idx}"]`);
        if (slider) slider.value = amp;
      });

      this.synth.setInharmonicity(preset.inharmonicity);
      q("#stretch-slider").value = preset.inharmonicity;
      q("#stretch-val").textContent = preset.inharmonicity;

      this.synth.setHighDecayRate(preset.highDecayRate);
      q("#decay-slider").value = preset.highDecayRate;
      q("#decay-val").textContent = preset.highDecayRate;
    });
  }

  _setSoundMode(mode) {
    this.state.soundMode = mode;
    const easyBtn = this.container.querySelector("#mode-easy");
    const hardBtn = this.container.querySelector("#mode-hard");
    const rack = this.container.querySelector("#synth-rack");

    easyBtn.classList.toggle("active", mode === "easy");
    hardBtn.classList.toggle("active", mode === "hard");
    rack.classList.toggle("hidden", mode === "easy");

    if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
  }
}
