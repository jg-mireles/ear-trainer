// theory/IntervalGenerator.js
// Generates tonic-anchored intervals in Major/Minor keys OR fully chromatic intervals from any starting note

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

const CHROMATIC_STARTS_LOW = [
  "C3", "Db3", "D3", "Eb3", "E3", "F3", "F#3", "G3", "Ab3", "A3", "Bb3", "B3",
  "C4", "Db4", "D4", "Eb4", "E4", "F4", "F#4", "G4"
];

const CHROMATIC_STARTS_HIGH = [
  "C4", "Db4", "D4", "Eb4", "E4", "F4", "F#4", "G4", "Ab4", "A4", "Bb4", "B4", "C5"
];

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
    Db: { tonic: "C#", vexSig: "C#m", useFlats: false },
    "G#": { tonic: "G#", vexSig: "G#m", useFlats: false },
    Ab: { tonic: "Ab", vexSig: "Abm", useFlats: true },
    "D#": { tonic: "D#", vexSig: "D#m", useFlats: false },
    Eb: { tonic: "Eb", vexSig: "Ebm", useFlats: true },
    Bb: { tonic: "Bb", vexSig: "Bbm", useFlats: true },
    F:  { tonic: "F",  vexSig: "Fm",  useFlats: true },
    C:  { tonic: "C",  vexSig: "Cm",  useFlats: true },
    G:  { tonic: "G",  vexSig: "Gm",  useFlats: true },
    D:  { tonic: "D",  vexSig: "Dm",  useFlats: true },
    Gb: { tonic: "F#", vexSig: "F#m", useFlats: false },
  },
};

export class IntervalGenerator {
  _getKeyMeta(keyTonic, scaleType = "major") {
    const modeTable = KEY_SPELLING_TABLE[scaleType] || KEY_SPELLING_TABLE.major;
    return modeTable[keyTonic] || { tonic: "C", vexSig: "C", useFlats: false };
  }

  _spellForKey(noteWithOctave, useFlats) {
    const simplified = Tonal.Note.simplify(noteWithOctave);
    const midi = Tonal.Note.midi(simplified);
    if (midi === null) return simplified;
    return Tonal.Note.fromMidi(midi, { sharps: !useFlats });
  }

  getVexKeySignature(keyTonic, scaleType = "major") {
    if (!keyTonic || keyTonic === "random" || keyTonic === "chromatic") return null;
    return this._getKeyMeta(keyTonic, scaleType).vexSig;
  }

  getKeyDisplayName(keyTonic, scaleType = "major") {
    if (keyTonic === "chromatic") return "Fully Chromatic (Any Starting Note)";
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

    const isDescending = direction === "descending";

    // --- BRANCH 1: FULLY CHROMATIC MODE (Any starting note, any active interval) ---
    if (keyTonic === "chromatic") {
      const candidateIntervals = INTERVALS.filter((i) => activeIds.includes(i.id));
      const pool = candidateIntervals.length > 0 ? candidateIntervals : INTERVALS;
      const interval = pool[Math.floor(Math.random() * pool.length)];

      const startPool = isDescending ? CHROMATIC_STARTS_HIGH : CHROMATIC_STARTS_LOW;
      const startNote = startPool[Math.floor(Math.random() * startPool.length)];
      const useFlats = startNote.includes("b");

      const rawTarget = isDescending
        ? Tonal.Note.transpose(startNote, `-${interval.tonal}`)
        : Tonal.Note.transpose(startNote, interval.tonal);

      const targetNote =
        rawTarget.includes("##") || rawTarget.includes("bb")
          ? this._spellForKey(rawTarget, useFlats)
          : Tonal.Note.simplify(rawTarget);

      const lowerNote = isDescending ? targetNote : startNote;

      return {
        interval,
        direction,
        notes: [startNote, targetNote],
        playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
        keySignature: null,
        isChromatic: true,
        activeKeyTonic: Tonal.Note.pitchClass(lowerNote),
        activeScaleType: "major",
        activeKeyLabel: "Fully Chromatic",
        useFlats,
      };
    }

    // --- BRANCH 2: TONAL KEY MODE (Specific or Random Key, Tonic-Anchored) ---
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

    const secondNote =
      rawSecondNote.includes("##") || rawSecondNote.includes("bb")
        ? this._spellForKey(rawSecondNote, keyMeta.useFlats)
        : rawSecondNote;

    return {
      interval,
      direction,
      notes: [tonicNote, secondNote],
      playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
      keySignature,
      isChromatic: false,
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
    const tonicNote = exercise.isChromatic
      ? sortedIntervalNotes[0]
      : exercise.notes[0];
    const useFlats = Boolean(exercise.useFlats);

    const isMinor = !exercise.isChromatic && exercise.activeScaleType === "minor";
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
