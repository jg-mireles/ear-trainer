// ui/ControlsPanel.js
// Manages UI controls, Key/Scale selection (including Fully Chromatic), multi-select interval pills, BPM slider, and Synth Lab

import { INTERVALS, KEY_TONICS, SCALE_TYPES } from "../theory/IntervalGenerator.js?v=31";

const SYNTH_PRESETS = {
  saw: {
    label: "Warm Saw-ish",
    harmonics: [1.0, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12],
    inharmonicity: 0.0,
    highDecayRate: 1.5,
  },
  sine: {
    label: "Pure Sine (Fundamental)",
    harmonics: [1.0, 0, 0, 0, 0, 0, 0, 0],
    inharmonicity: 0.0,
    highDecayRate: 0.5,
  },
  clarinet: {
    label: "Hollow / Odd Harmonics",
    harmonics: [1.0, 0.02, 0.75, 0.02, 0.5, 0.02, 0.3, 0.02],
    inharmonicity: 0.0,
    highDecayRate: 1.2,
  },
  piano: {
    label: "Stretched Piano String",
    harmonics: [1.0, 0.65, 0.4, 0.28, 0.18, 0.1, 0.06, 0.03],
    inharmonicity: 0.00045,
    highDecayRate: 2.2,
  },
  bell: {
    label: "Metallic Inharmonic Bell",
    harmonics: [0.8, 0.4, 0.9, 0.2, 0.7, 0.5, 0.6, 0.4],
    inharmonicity: 0.0045,
    highDecayRate: 0.6,
  },
};

export class ControlsPanel {
  constructor(containerEl, synthInstance, callbacks = {}) {
    this.container = containerEl;
    this.synth = synthInstance;
    this.callbacks = callbacks;

    this.state = {
      keyTonic: "C",
      scaleType: "major",
      allowedIntervals: INTERVALS.map((i) => i.id),
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

  _render() {
    const keyOptions = [
      `<option value="chromatic">Fully Chromatic (Any Starting Note)</option>`,
      `<option value="random">Random Key (Major / Minor)</option>`,
      ...KEY_TONICS.map(
        (k) => `<option value="${k}" ${k === "C" ? "selected" : ""}>Key of ${k}</option>`
      ),
    ].join("");

    const scaleOptions = SCALE_TYPES.map(
      (s) => `<option value="${s.id}">${s.label}</option>`
    ).join("");

    const intervalChips = INTERVALS.map(
      (int) => `
        <button type="button"
                class="interval-chip selected"
                data-id="${int.id}"
                title="${int.name}">
          ${int.id}
        </button>`
    ).join("");

    const presetOptions = Object.entries(SYNTH_PRESETS)
      .map(([key, val]) => `<option value="${key}">${val.label}</option>`)
      .join("");

    const harmonicSliders = this.synth.params.harmonics
      .map(
        (amp, idx) => `
        <div class="harmonic-col">
          <input type="range" class="harm-slider" data-index="${idx}"
                 min="0" max="1" step="0.01" value="${amp}" />
          <span>H${idx + 1}</span>
        </div>`
      )
      .join("");

    this.container.innerHTML = `
      <section class="panel-card">
        <div class="section-header">
          <h2>1. Exercise & Tempo Settings</h2>
          <div class="mode-toggle">
            <button type="button" id="btn-mode-easy" class="active">Easy (Piano)</button>
            <button type="button" id="btn-mode-hard">Hard (Synth Lab)</button>
          </div>
        </div>

        <div class="controls-grid">
          <label>
            <span>Key / Tonality</span>
            <select id="key-select">${keyOptions}</select>
          </label>

          <label>
            <span>Scale (Major / Minor)</span>
            <select id="scale-select">${scaleOptions}</select>
          </label>

          <label>
            <span>Playback Order</span>
            <select id="direction-select">
              <option value="harmonic">Same Time (Harmonic)</option>
              <option value="ascending" selected>Lower → Higher (Ascending)</option>
              <option value="descending">Higher → Lower (Descending)</option>
            </select>
          </label>

          <label>
            <span>Tempo: <strong id="bpm-display">${this.state.bpm}</strong> BPM</span>
            <input id="bpm-slider" type="range" min="40" max="200" value="${this.state.bpm}" />
            <small class="checkbox-row">
              <input type="checkbox" id="metronome-toggle" /> 2-beat count-in click
            </small>
          </label>

          <div class="interval-filter-box">
            <div class="interval-filter-header">
              <span>Intervals Included (<strong id="selected-count">12</strong>/12)</span>
              <div class="filter-quick-btns">
                <button type="button" id="btn-intervals-all" class="mini-btn">All</button>
                <button type="button" id="btn-intervals-none" class="mini-btn">None</button>
              </div>
            </div>
            <div id="interval-chips" class="interval-chips">${intervalChips}</div>
          </div>
        </div>

        <div class="action-row">
          <button type="button" id="btn-new" class="primary-btn">New Interval</button>
          <button type="button" id="btn-repeat">Repeat Audio</button>
          <button type="button" id="btn-reveal">Reveal on Staff</button>
        </div>
      </section>

      <section id="synth-lab" class="panel-card hidden">
        <div class="section-header">
          <h2>2. Harmonic & Acoustic Physics Lab</h2>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="tuning-select" aria-label="Tuning System">
              <option value="12-TET">Tuning: 12-TET (Equal)</option>
              <option value="JUST">Tuning: Just Intonation (Pure)</option>
              <option value="PYTHAGOREAN">Tuning: Pythagorean (3:2)</option>
            </select>
            <select id="preset-select" aria-label="Timbre Preset">${presetOptions}</select>
          </div>
        </div>

        <div class="harmonics-rack">${harmonicSliders}</div>

        <div class="physics-grid">
          <label>
            <span>Inharmonicity Stretch (B): <strong id="inharm-val">0.0000</strong></span>
            <input id="inharm-slider" type="range" min="0" max="0.006" step="0.0001" value="0" />
          </label>
          <label>
            <span>High-Harmonic Decay Rate: <strong id="decay-val">1.5</strong></span>
            <input id="decay-slider" type="range" min="0.2" max="4.0" step="0.1" value="1.5" />
          </label>
        </div>
      </section>
    `;
  }

  _syncChipsUI() {
    const chips = this.container.querySelectorAll(".interval-chip");
    chips.forEach((chip) => {
      const isSelected = this.state.allowedIntervals.includes(chip.dataset.id);
      chip.classList.toggle("selected", isSelected);
    });
    const countEl = this.container.querySelector("#selected-count");
    if (countEl) countEl.textContent = this.state.allowedIntervals.length;
  }

  _bindEvents() {
    const q = (sel) => this.container.querySelector(sel);

    const keySelect = q("#key-select");
    const scaleSelect = q("#scale-select");

    const triggerKeyChange = () => {
      this.state.keyTonic = keySelect.value;
      this.state.scaleType = scaleSelect.value;
      scaleSelect.disabled = this.state.keyTonic === "chromatic";
      if (this.callbacks.onKeyChange) {
        this.callbacks.onKeyChange(this.state.keyTonic, this.state.scaleType);
      }
    };

    keySelect.addEventListener("change", triggerKeyChange);
    scaleSelect.addEventListener("change", triggerKeyChange);

    this.container.querySelectorAll(".interval-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.id;
        const idx = this.state.allowedIntervals.indexOf(id);
        if (idx >= 0) {
          this.state.allowedIntervals.splice(idx, 1);
        } else {
          this.state.allowedIntervals.push(id);
        }
        this._syncChipsUI();
      });
    });

    q("#btn-intervals-all").addEventListener("click", () => {
      this.state.allowedIntervals = INTERVALS.map((i) => i.id);
      this._syncChipsUI();
    });

    q("#btn-intervals-none").addEventListener("click", () => {
      this.state.allowedIntervals = [];
      this._syncChipsUI();
    });

    q("#direction-select").addEventListener("change", (e) => {
      this.state.direction = e.target.value;
    });

    q("#bpm-slider").addEventListener("input", (e) => {
      this.state.bpm = Number(e.target.value);
      q("#bpm-display").textContent = this.state.bpm;
    });

    q("#metronome-toggle").addEventListener("change", (e) => {
      this.state.metronomeClick = e.target.checked;
    });

    q("#btn-mode-easy").addEventListener("click", () => this._setSoundMode("easy"));
    q("#btn-mode-hard").addEventListener("click", () => this._setSoundMode("hard"));

    q("#btn-new").addEventListener("click", () => {
      if (this.state.allowedIntervals.length === 0) {
        this.state.allowedIntervals = INTERVALS.map((i) => i.id);
        this._syncChipsUI();
      }
      this.callbacks.onNewExercise?.(this.getOptions());
    });

    q("#btn-repeat").addEventListener("click", () => {
      this.callbacks.onRepeat?.(this.getOptions());
    });

    q("#btn-reveal").addEventListener("click", () => {
      this.callbacks.onReveal?.();
    });

    q("#tuning-select").addEventListener("change", (e) => {
      this.state.tuning = e.target.value;
      if (this.callbacks.onTuningChange) {
        this.callbacks.onTuningChange(e.target.value);
      }
    });

    q("#preset-select").addEventListener("change", (e) => {
      const preset = SYNTH_PRESETS[e.target.value];
      if (!preset) return;

      this.synth.params.harmonics = [...preset.harmonics];
      this.synth.params.inharmonicity = preset.inharmonicity;
      this.synth.params.highDecayRate = preset.highDecayRate;

      this.container.querySelectorAll(".harm-slider").forEach((sl, idx) => {
        sl.value = preset.harmonics[idx];
      });
      q("#inharm-slider").value = preset.inharmonicity;
      q("#inharm-val").textContent = preset.inharmonicity.toFixed(4);
      q("#decay-slider").value = preset.highDecayRate;
      q("#decay-val").textContent = preset.highDecayRate.toFixed(1);
    });

    this.container.querySelectorAll(".harm-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        this.synth.params.harmonics[idx] = Number(e.target.value);
      });
    });

    q("#inharm-slider").addEventListener("input", (e) => {
      const val = Number(e.target.value);
      this.synth.params.inharmonicity = val;
      q("#inharm-val").textContent = val.toFixed(4);
    });

    q("#decay-slider").addEventListener("input", (e) => {
      const val = Number(e.target.value);
      this.synth.params.highDecayRate = val;
      q("#decay-val").textContent = val.toFixed(1);
    });
  }

  _setSoundMode(mode) {
    this.state.soundMode = mode;
    const isHard = mode === "hard";
    this.container.querySelector("#btn-mode-easy").classList.toggle("active", !isHard);
    this.container.querySelector("#btn-mode-hard").classList.toggle("active", isHard);
    this.container.querySelector("#synth-lab").classList.toggle("hidden", !isHard);

    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(mode);
    }
  }

  getOptions() {
    return {
      ...this.state,
      stagger: this.getStaggerSeconds(),
    };
  }
}
