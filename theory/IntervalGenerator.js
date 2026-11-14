// theory/IntervalGenerator.js
// Generates tonic-anchored intervals in Major/Minor keys with strict, standard key-signature spelling (flats vs. sharps)

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
  "C", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"
];

export const SCALE_TYPES = [
  {
    id: "major",
    label: "Major",
    isMinor: false,
    intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
    ascendingIntervalIds: ["M2", "M3", "P4", "P5", "M6", "M7", "P8"],
    descendingIntervalIds: ["m2", "m3", "P4", "P5", "m6", "m7", "P8"],
  },
  {
    id: "minor",
    label: "Minor",
    isMinor: true,
    intervals: ["1P", "2M", "3m", "4P", "5P", "6m", "7m"],
    ascendingIntervalIds: ["M2", "m3", "P4", "P5", "m6", "m7", "P8"],
    descendingIntervalIds: ["M2", "M3", "P4", "P5", "M6", "m7", "P8"],
  },
];

// Standard circle-of-fifths key signatures supported by VexFlow
// Maps any theoretical enharmonic choice to its standard key signature & accidental preference
const KEY_SPELLING_TABLE = {
  major: {
    C:  { tonic: "C",  vexSig: "C",  useFlats: false },
    G:  { tonic: "G",  vexSig: "G",  useFlats: false },
    D:  { tonic: "D",  vexSig: "D",  useFlats: false },
    A:  { tonic: "A",  vexSig: "A",  useFlats: false },
    E:  { tonic: "E",  vexSig: "E",  useFlats: false },
    B:  { tonic: "B",  vexSig: "B",  useFlats: false },
    "F#": { tonic: "F#", vexSig: "F#", useFlats: false },
    Gb: { tonic: "Gb", vexSig: "Gb", useFlats: true },
    Db: { tonic: "Db", vexSig: "Db", useFlats: true },
    Ab: { tonic: "Ab", vexSig: "Ab", useFlats: true },
    Eb: { tonic: "Eb", vexSig: "Eb", useFlats: true },
    Bb: { tonic: "Bb", vexSig: "Bb", useFlats: true },
    F:  { tonic: "F",  vexSig: "F",  useFlats: true },
  },
  minor: {
    A:  { tonic: "A",  vexSig: "Am",  useFlats: false },
    E:  { tonic: "E",  vexSig: "Em",  useFlats: false },
    B:  { tonic: "B",  vexSig: "Bm",  useFlats: false },
    "F#": { tonic: "F#", vexSig: "F#m", useFlats: false },
    "C#": { tonic: "C#", vexSig: "C#m", useFlats: false },
    Db: { tonic: "C#", vexSig: "C#m", useFlats: false }, // Db minor doesn't exist in standard key sigs -> C# minor (4 sharps)
    "G#": { tonic: "G#", vexSig: "G#m", useFlats: false },
    Ab: { tonic: "Ab", vexSig: "Abm", useFlats: true },  // 7 flats
    "D#": { tonic: "D#", vexSig: "D#m", useFlats: false },
    Eb: { tonic: "Eb", vexSig: "Ebm", useFlats: true },  // 6 flats
    Bb: { tonic: "Bb", vexSig: "Bbm", useFlats: true },  // 5 flats
    F:  { tonic: "F",  vexSig: "Fm",  useFlats: true },  // 4 flats
    C:  { tonic: "C",  vexSig: "Cm",  useFlats: true },  // 3 flats
    G:  { tonic: "G",  vexSig: "Gm",  useFlats: true },  // 2 flats
    D:  { tonic: "D",  vexSig: "Dm",  useFlats: true },  // 1 flat
    Gb: { tonic: "F#", vexSig: "F#m", useFlats: false }, // Gb minor -> F# minor (3 sharps)
  },
};

export class IntervalGenerator {
  _getKeyMeta(keyTonic, scaleType = "major") {
    const modeTable = KEY_SPELLING_TABLE[scaleType] || KEY_SPELLING_TABLE.major;
    return modeTable[keyTonic] || { tonic: "C", vexSig: "C", useFlats: false };
  }

  /**
   * Ensures a transposed note uses the proper flat or sharp spelling for the active key
   */
  _spellForKey(noteWithOctave, useFlats) {
    const simplified = Tonal.Note.simplify(noteWithOctave);
    const midi = Tonal.Note.midi(simplified);
    if (midi === null) return simplified;
    return Tonal.Note.fromMidi(midi, { sharps: !useFlats });
  }

  /**
   * Returns the VexFlow key signature string (e.g., "Db", "F#", "Ebm", "C#m")
   */
  getVexKeySignature(keyTonic, scaleType = "major") {
    if (!keyTonic || keyTonic === "random") return null;
    return this._getKeyMeta(keyTonic, scaleType).vexSig;
  }

  /**
   * Returns human-readable key name (e.g., "Db Major", "Eb Minor")
   */
  getKeyDisplayName(keyTonic, scaleType = "major") {
    if (!keyTonic || keyTonic === "random") return "Random Key";
    const meta = this._getKeyMeta(keyTonic, scaleType);
    const scaleLabel = scaleType === "minor" ? "Minor" : "Major";
    return `${meta.tonic} ${scaleLabel}`;
  }

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
    const keyMeta = this._getKeyMeta(resolvedKeyTonic, resolvedScaleType);
    const scaleDef =
      SCALE_TYPES.find((s) => s.id === resolvedScaleType) || SCALE_TYPES[0];

    const keySignature = keyMeta.vexSig;
    const activeKeyLabel = this.getKeyDisplayName(keyMeta.tonic, resolvedScaleType);

    const isDescending = direction === "descending";
    const diatonicIds = isDescending
      ? scaleDef.descendingIntervalIds
      : scaleDef.ascendingIntervalIds;

    const scaleIntervalObjs = INTERVALS.filter((i) => diatonicIds.includes(i.id));
    const intersected = scaleIntervalObjs.filter((i) => activeIds.includes(i.id));
    const candidateIntervals =
      intersected.length > 0 ? intersected : scaleIntervalObjs;

    const interval =
      candidateIntervals[Math.floor(Math.random() * candidateIntervals.length)];

    const tonicOctave = isDescending
      ? "4"
      : Math.random() < 0.5
      ? "3"
      : "4";
    const tonicNote = `${keyMeta.tonic}${tonicOctave}`;

    const rawSecondNote = isDescending
      ? Tonal.Note.transpose(tonicNote, `-${interval.tonal}`)
      : Tonal.Note.transpose(tonicNote, interval.tonal);

    // Keep exact diatonic letter spelling when valid, and prevent double-sharps/double-flats
    const secondNote = rawSecondNote.includes("##") || rawSecondNote.includes("bb")
      ? this._spellForKey(rawSecondNote, keyMeta.useFlats)
      : rawSecondNote;

    return {
      interval,
      direction,
      notes: [tonicNote, secondNote],
      playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
      keySignature,
      activeKeyTonic: keyMeta.tonic,
      activeScaleType: resolvedScaleType,
      activeKeyLabel,
      useFlats: keyMeta.useFlats,
    };
  }

  getContextSequence(exercise) {
    const sortedIntervalNotes = [...exercise.notes].sort(
      (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
    );
    const tonicNote = exercise.notes[0];
    const useFlats = Boolean(exercise.useFlats);

    const isMinor = exercise.activeScaleType === "minor";
    const scaleDef =
      SCALE_TYPES.find((s) => s.id === (exercise.activeScaleType || "major")) ||
      SCALE_TYPES[0];

    const cleanNote = (n) =>
      n.includes("##") || n.includes("bb") ? this._spellForKey(n, useFlats) : n;

    const triad = [
      tonicNote,
      cleanNote(Tonal.Note.transpose(tonicNote, isMinor ? "3m" : "3M")),
      cleanNote(Tonal.Note.transpose(tonicNote, "5P")),
    ];

    const ascendingScale = [
      ...scaleDef.intervals.map((iv) => cleanNote(Tonal.Note.transpose(tonicNote, iv))),
      cleanNote(Tonal.Note.transpose(tonicNote, "8P")),
    ];

    return {
      triad,
      ascendingScale,
      intervalAscending: sortedIntervalNotes,
    };
  }
}
