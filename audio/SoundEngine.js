// audio/SoundEngine.js
// Unified facade routing audio calls to either Easy Mode (Piano) or Hard Mode (Synth)

import { PianoSampler } from "./PianoSampler.js";
import { AdditiveSynth } from "./AdditiveSynth.js";

export class SoundEngine {
  constructor(onPianoReady) {
    this.mode = "easy"; // "easy" | "hard"
    this.piano = new PianoSampler(onPianoReady);
    this.synth = new AdditiveSynth(Tone.context.rawContext);
  }

  setMode(mode) {
    if (mode === "easy" || mode === "hard") {
      this.mode = mode;
    }
  }

  playNote(note, duration = 1.0) {
    if (this.mode === "easy") {
      this.piano.playNote(note, duration);
    } else {
      const freq = Tone.Frequency(note).toFrequency();
      this.synth.playFreq(freq, duration);
    }
  }

  playChord(notes, options = { duration: 1.2, mode: "harmonic", stagger: 0.4 }) {
    if (this.mode === "easy") {
      this.piano.playChord(notes, options);
    } else {
      const freqs = notes.map((n) => Tone.Frequency(n).toFrequency());
      this.synth.playChord(freqs, options);
    }
  }
}
