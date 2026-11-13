// theory/TuningSystem.js
// Calculates fundamental frequencies (f0) across different tuning systems

export const TUNING_SYSTEMS = {
  "12-TET": {
    name: "12-Tone Equal Temperament (Modern Standard)",
    description: "Every semitone is equally spaced by 2^(1/12).",
  },
  "JUST": {
    name: "5-Limit Just Intonation (Pure Harmonics)",
    description: "Intervals locked to simple whole-number ratios (e.g., 3:2 fifth, 5:4 major third).",
    ratios: [
      1 / 1,     // Unison (0)
      16 / 15,   // Minor 2nd (1)
      9 / 8,     // Major 2nd (2)
      6 / 5,     // Minor 3rd (3)
      5 / 4,     // Major 3rd (4)
      4 / 3,     // Perfect 4th (5)
      45 / 32,   // Tritone (6)
      3 / 2,     // Perfect 5th (7)
      8 / 5,     // Minor 6th (8)
      5 / 3,     // Major 6th (9)
      9 / 5,     // Minor 7th (10)
      15 / 8,    // Major 7th (11)
      2 / 1,     // Octave (12)
    ],
  },
  "PYTHAGOREAN": {
    name: "Pythagorean Tuning (Pure 3:2 Fifths)",
    description: "Built purely from stacked 3:2 fifths—pure fifths/fourths, wide major thirds (81:64).",
    ratios: [
      1 / 1,         // Unison (0)
      256 / 243,     // Minor 2nd (1)
      9 / 8,         // Major 2nd (2)
      32 / 27,       // Minor 3rd (3)
      81 / 64,       // Major 3rd (4)
      4 / 3,         // Perfect 4th (5)
      729 / 512,     // Tritone (6)
      3 / 2,         // Perfect 5th (7)
      128 / 81,      // Minor 6th (8)
      27 / 16,       // Major 6th (9)
      16 / 9,        // Minor 7th (10)
      243 / 128,     // Major 7th (11)
      2 / 1,         // Octave (12)
    ],
  },
};

export class TuningSystem {
  constructor(systemId = "12-TET") {
    this.systemId = systemId;
  }

  setSystem(systemId) {
    if (TUNING_SYSTEMS[systemId]) {
      this.systemId = systemId;
    }
  }

  /**
   * Converts an array of notes into frequencies relative to the lowest note as root
   * @param {string[]} notes - e.g., ["C4", "E4"] or ["G4", "C4"]
   */
  getFrequencies(notes) {
    if (!notes || notes.length === 0) return [];

    // In 12-TET, each note converts directly from A4 = 440Hz
    if (this.systemId === "12-TET") {
      return notes.map((n) => Tone.Frequency(n).toFrequency());
    }

    // For Just Intonation & Pythagorean, anchor the lowest note in 12-TET
    // and compute the upper note(s) via exact frequency ratios
    const midis = notes.map((n) => Tonal.Note.midi(n));
    const lowestMidi = Math.min(...midis);
    const rootFreq = Tone.Frequency(lowestMidi, "midi").toFrequency();
    const ratioTable = TUNING_SYSTEMS[this.systemId].ratios;

    return midis.map((midi) => {
      const semitoneDiff = midi - lowestMidi;
      const octaves = Math.floor(semitoneDiff / 12);
      const step = ((semitoneDiff % 12) + 12) % 12;
      return rootFreq * ratioTable[step] * Math.pow(2, octaves);
    });
  }
}
