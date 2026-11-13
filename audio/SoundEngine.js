// audio/SoundEngine.js
// Unified Audio Router: Switches seamlessly between Easy (Piano) and Hard (Additive Synth)

import { PianoSampler } from "./PianoSampler.js";
import { AdditiveSynth } from "./AdditiveSynth.js";
import { TuningSystem } from "../theory/TuningSystem.js";

export class SoundEngine {
  constructor(onPianoReady) {
    this.mode = "easy"; // "easy" | "hard"
    this.piano = new PianoSampler(onPianoReady);
    this.synth = new AdditiveSynth(Tone.context.rawContext);
    this.tuning = new TuningSystem("12-TET");
  }

  setMode(newMode) {
    this.mode = newMode === "hard" ? "hard" : "easy";
  }

  setTuning(tuningId) {
    this.tuning.setSystem(tuningId);
  }

  playChord(notes, { duration = 1.2, mode = "harmonic", stagger = 0.4, allowShort = false } = {}) {
    if (!notes || notes.length === 0) return;

    if (this.mode === "easy") {
      this.piano.playChord(notes, { duration, mode, stagger });
    } else {
      const rootNote = notes[0];
      const freqs = notes.map((note) => this.tuning.getFrequency(note, rootNote));
      this.synth.playChord(freqs, { duration, mode, stagger, allowShort });
    }
  }
}
