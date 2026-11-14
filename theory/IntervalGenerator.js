// theory/IntervalGenerator.js
// Generates tonic-anchored intervals in Major/Minor keys (specific or random):
// - Ascending / Harmonic: Tonic is the LOWER note (steps up to a scale degree)
// - Descending: Tonic is the HIGHER note (steps down to a scale degree)

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

export const KEY_TONICS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
];

export const SCALE_TYPES = [
  {
    id: "major",
    label: "Major",
    isMinor: false,
    intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
    // Intervals formed going UP from the tonic
    ascendingIntervalIds: ["M2", "M3", "P4", "P5", "M6", "M7", "P8"],
    // Intervals formed going DOWN from the tonic (inversions of scale degrees)
    descendingIntervalIds: ["m2", "m3", "P4", "P5", "m6", "m7", "P8"],
  },
  {
    id: "minor",
    label: "Minor",
    isMinor: true,
    intervals: ["1P", "2M", "3m", "4P", "5P", "6m", "7m"],
    // Intervals formed going UP from the tonic in Natural Minor
    ascendingIntervalIds: ["M2", "m3", "P4", "P5", "m6", "m7", "P8"],
    // Intervals formed going DOWN from the tonic in Natural Minor
    descendingIntervalIds: ["M2", "M3", "P4", "P5", "M6", "m7", "P8"],
  },
];

// Normalize enharmonic tonics so VexFlow always renders standard key signatures
const MINOR_TONIC_MAP = {
  Db: "C#",
  Gb: "F#",
  Ab: "G#",
};

const MAJOR_TONIC_MAP = {
  "F#": "Gb",
};

export class IntervalGenerator {
  _resolveTonic(keyTonic, scaleType) {
    if (scaleType === "minor") {
      return MINOR_TONIC_MAP[keyTonic] || keyTonic;
    }
    return MAJOR_TONIC_MAP[keyTonic] || keyTonic;
  }

  /**
   * Returns the VexFlow key signature string (e.g., "Eb", "Bb", "C#m", "Am")
   */
  getVexKeySignature(keyTonic, scaleType = "major") {
    if (!keyTonic || keyTonic === "random") return null;
    const normalized = this._resolveTonic(keyTonic, scaleType);
    return scaleType === "minor" ? `${normalized}m` : normalized;
  }

  /**
   * Returns human-readable key name (e.g., "Eb Major", "C# Minor")
   */
  getKeyDisplayName(keyTonic, scaleType = "major") {
    if (!keyTonic || keyTonic === "random") return "Random Key";
    const normalized = this._resolveTonic(keyTonic, scaleType);
    const scaleLabel = scaleType === "minor" ? "Minor" : "Major";
    return `${normalized} ${scaleLabel}`;
  }

  /**
   * Builds a two-note exercise anchored on the tonic of the chosen key:
   * - Ascending / Harmonic: Tonic is the LOWER note ([Tonic, UpperScaleNote])
   * - Descending: Tonic is the HIGHER note ([Tonic, LowerScaleNote])
   */
  createExercise({
    allowedIntervals = null,
    direction = "ascending",
    keyTonic = "C",
    scaleType = "major",
  } = {}) {
    const activeIds =
      allowedIntervals && allowedIntervals.length > 0
        ? allowedIntervals
        : INTERVALS.map((i) => i.id);

    const resolvedKeyTonic =
      keyTonic === "random"
        ? KEY_TONICS[Math.floor(Math.random() * KEY_TONICS.length)]
        : keyTonic;

    const resolvedScaleType = scaleType || "major";
    const normalizedTonic = this._resolveTonic(resolvedKeyTonic, resolvedScaleType);
    const scaleDef =
      SCALE_TYPES.find((s) => s.id === resolvedScaleType) || SCALE_TYPES[0];

    const keySignature = this.getVexKeySignature(normalizedTonic, resolvedScaleType);
    const activeKeyLabel = this.getKeyDisplayName(normalizedTonic, resolvedScaleType);

    const isDescending = direction === "descending";
    const diatonicIds = isDescending
      ? scaleDef.descendingIntervalIds
      : scaleDef.ascendingIntervalIds;

    // Intersect user's selected interval pills with the valid diatonic intervals from the tonic
    const scaleIntervalObjs = INTERVALS.filter((i) => diatonicIds.includes(i.id));
    const intersected = scaleIntervalObjs.filter((i) => activeIds.includes(i.id));
    const candidateIntervals =
      intersected.length > 0 ? intersected : scaleIntervalObjs;

    const interval =
      candidateIntervals[Math.floor(Math.random() * candidateIntervals.length)];

    // Place the tonic in octave 4 when descending (so stepping down lands cleanly in octave 3/4),
    // and in octave 3 or 4 when ascending/harmonic
    const tonicOctave = isDescending
      ? "4"
      : Math.random() < 0.5
      ? "3"
      : "4";
    const tonicNote = `${normalizedTonic}${tonicOctave}`;

    const secondNote = isDescending
      ? Tonal.Note.transpose(tonicNote, `-${interval.tonal}`)
      : Tonal.Note.transpose(tonicNote, interval.tonal);

    return {
      interval,
      direction,
      notes: [tonicNote, secondNote],
      playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
      keySignature,
      activeKeyTonic: normalizedTonic,
      activeScaleType: resolvedScaleType,
      activeKeyLabel,
    };
  }

  /**
   * Builds the post-answer context sequence:
   * 1. Tonic Triad (1 - 3 - 5)
   * 2. 1-Octave Ascending Scale from the tonic
   * 3. Target Interval sorted Lower -> Higher
   */
  getContextSequence(exercise) {
    const sortedIntervalNotes = [...exercise.notes].sort(
      (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
    );
    const tonicNote = exercise.notes[0];

    const isMinor = exercise.activeScaleType === "minor";
    const scaleDef =
      SCALE_TYPES.find((s) => s.id === (exercise.activeScaleType || "major")) ||
      SCALE_TYPES[0];

    const triad = [
      tonicNote,
      Tonal.Note.transpose(tonicNote, isMinor ? "3m" : "3M"),
      Tonal.Note.transpose(tonicNote, "5P"),
    ];

    const ascendingScale = [
      ...scaleDef.intervals.map((iv) => Tonal.Note.transpose(tonicNote, iv)),
      Tonal.Note.transpose(tonicNote, "8P"),
    ];

    return {
      triad,
      ascendingScale,
      intervalAscending: sortedIntervalNotes,
    };
  }
}
