// theory/IntervalGenerator.js
// Uses Tonal.js to spell intervals accurately and order notes by playback direction

export const INTERVALS = [
  { id: "m2", tonal: "2m", name: "Minor 2nd", semitones: 1 },
  { id: "M2", tonal: "2M", name: "Major 2nd", semitones: 2 },
  { id: "m3", tonal: "3m", name: "Minor 3rd", semitones: 3 },
  { id: "M3", tonal: "3M", name: "Major 3rd", semitones: 4 },
  { id: "P4", tonal: "4P", name: "Perfect 4th", semitones: 5 },
  { id: "TT", tonal: "4A", name: "Tritone", semitones: 6 },
  { id: "P5", tonal: "5P", name: "Perfect 5th", semitones: 7 },
  { id: "m6", tonal: "6m", name: "Minor 6th", semitones: 8 },
  { id: "M6", tonal: "6M", name: "Major 6th", semitones: 9 },
  { id: "m7", tonal: "7m", name: "Minor 7th", semitones: 10 },
  { id: "M7", tonal: "7M", name: "Major 7th", semitones: 11 },
  { id: "P8", tonal: "8P", name: "Octave", semitones: 12 },
];

// Clean root notes in C3–F4 range so spelled intervals avoid double-sharps/flats
const ROOT_POOL = [
  "C3", "D3", "Eb3", "E3", "F3", "G3", "Ab3", "A3", "Bb3", "B3",
  "C4", "D4", "Eb4", "E4", "F4", "G4"
];

export class IntervalGenerator {
  /**
   * Builds a two-note exercise with proper enharmonic spelling
   * @param {string} intervalId - e.g., "P5" or "random"
   * @param {string} direction - "harmonic" | "ascending" | "descending"
   */
  createExercise(intervalId = "random", direction = "ascending") {
    const interval =
      intervalId === "random"
        ? INTERVALS[Math.floor(Math.random() * INTERVALS.length)]
        : INTERVALS.find((i) => i.id === intervalId) || INTERVALS[6];

    const lowerNote = ROOT_POOL[Math.floor(Math.random() * ROOT_POOL.length)];
    const upperNote = Tonal.Note.transpose(lowerNote, interval.tonal);

    const notes =
      direction === "descending"
        ? [upperNote, lowerNote]
        : [lowerNote, upperNote];

    return {
      interval,
      direction,
      notes,
      playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
    };
  }
}
