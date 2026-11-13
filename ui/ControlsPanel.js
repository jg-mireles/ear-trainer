// ui/ControlsPanel.js
// Manages the Training Controls, Metronome BPM slider, Tuning Selector, and Hard Mode Harmonic Rack

import { INTERVALS } from "../theory/IntervalGenerator.js";

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
    { onNewExercise, onRepeat, onReveal, onModeChange, onTuningChange } = {}
  ) {
    this.container = containerEl;
    this.synth = synthEngine;
    this.callbacks = {
      onNewExercise,
      onRepeat,
      onReveal,
      onModeChange,
      onTuningChange,
    };

    this.state = {
      selectedInterval: "random",
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

  // --- SECTION A: HTML Template ---

  _render() {
    const intervalOptions = [
      `<option value="random">Random (All 12 Intervals)</option>`,
      ...INTERVALS.map(
        (int) => `<option value="${int.id}">${int.name} (${int.id})</option>`
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
            <span>Interval Filter</span>
            <select id="interval-select">${intervalOptions}</select>
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
              <option value="sine">Presetui/ControlsPanel.js
