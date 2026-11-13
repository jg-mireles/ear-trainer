// audio/SoundEngine.js
// Unified facade routing audio calls to Easy Mode (Piano) or Hard Mode (Synth)

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

  setMode(mode) {
    if (mode === "easy" || mode === "hard") {
      this.mode = mode;
    }
  }

  setTuning(systemId) {
    this.tuning.setSystem(systemId);
  }

  playNote(note, duration = 1.0) {
    if (this.mode === "easy") {
      this.piano.playNote(note, duration);
    } else {
      const [freq] = this.tuning.getFrequencies([note]);
      this.synth.playFreq(freq, duration);
    }
  }

  playChord(notes, options = { duration: 1.2, mode: "harmonic", stagger: 0.4 }) {
    if (this.mode === "easy") {
      this.piano.playChord(notes, options);
    } else {
      const freqs = this.tuning.getFrequencies(notes);
      this.synth.playChord(freqs, options);
    }
  }
}
