// theory/IntervalGenerator.js
// Generates intervals using Tonal.js (chromatic or constrained to a chosen scale/key)

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

export const ROOT_POOL = [
  "C3", "D3", "Eb3", "E3", "F3", "G3", "Ab3", "A3", "Bb3", "B3",
  "C4", "D4", "Eb4", "E4", "F4", "G4", "A4", "Bb4", "B4", "C5"
];

export const KEY_TONICS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
];

export const SCALE_TYPES = [
  { id: "major", label: "Major", isMinor: false },
  { id: "minor", label: "Natural Minor", isMinor: true },
  { id: "harmonic minor", label: "Harmonic Minor", isMinor: true },
  { id: "melodic minor", label: "Melodic Minor", isMinor: true },
  { id: "major pentatonic", label: "Major Pentatonic", isMinor: false },
  { id: "minor pentatonic", label: "Minor Pentatonic", isMinor: true },
];

export class IntervalGenerator {
  getVexKeySignature(keyTonic, scaleType) {
    if (!keyTonic || keyTonic === "none") return null;
    const scaleMeta = SCALE_TYPES.find((s) => s.id === scaleType);
    const isMinor = scaleMeta ? scaleMeta.isMinor : false;

    const normalizeMap = {
      "Dbm": "C#m",
      "Gbm": "F#m",
      "Cbm": "Bm",
      "A#": "Bb",
      "D#": "Eb",
      "G#": "Ab",
    };

    const rawSig = isMinor ? `${keyTonic}m` : keyTonic;
    return normalizeMap[rawSig] || rawSig;
  }

  _getScaleNotesInRange(keyTonic, scaleType) {
    const scale = Tonal.Scale.get(`${keyTonic} ${scaleType}`);
    const pitchClasses = scale.notes;
    const concreteNotes = [];

    for (const octave of [3, 4, 5]) {
      for (const pc of pitchClasses) {
        const note = `${pc}${octave}`;
        const midi = Tonal.Note.midi(note);
        if (midi >= 48 && midi <= 72) {
          concreteNotes.push(note);
        }
      }
    }
    return concreteNotes.sort((a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b));
  }

  /**
   * Builds the post-answer context sequence:
   * 1. Tonic triad (1-3-5)
   * 2. One-octave ascending scale
   * 3. Exercise interval sorted lower -> higher
   */
  getContextSequence(exercise) {
    const sortedInterval = [...exercise.notes].sort(
      (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
    );

    const hasKey = exercise.keyTonic && exercise.keyTonic !== "none";
    const scaleMeta = SCALE_TYPES.find((s) => s.id === exercise.scaleType);
    const isMinor = hasKey && scaleMeta ? scaleMeta.isMinor : false;

    // Anchor the tonic triad & scale near octave 3/4 so it sits comfortably under/with the interval
    const tonicName = hasKey ? exercise.keyTonic : Tonal.Note.pitchClass(sortedInterval[0]);
    const activeScaleType = hasKey ? exercise.scaleType : "major";
    const baseOctave = Tonal.Note.octave(sortedInterval[0]) <= 3 ? 3 : 4;
    const tonicRoot = `${tonicName}${baseOctave}`;

    // 1. Tonic Triad (Root, 3rd, 5th)
    const thirdInterval = isMinor ? "3m" : "3M";
    const tonicChord = [
      tonicRoot,
      Tonal.Note.transpose(tonicRoot, thirdInterval),
      Tonal.Note.transpose(tonicRoot, "5P"),
    ];

    // 2. One-Octave Ascending Scale (from tonicRoot up to octave)
    const scaleInfo = Tonal.Scale.get(`${tonicName} ${activeScaleType}`);
    const ascendingScale = scaleInfo.intervals.map((ivl) =>
      Tonal.Note.transpose(tonicRoot, ivl)
    );
    ascendingScale.push(Tonal.Note.transpose(tonicRoot, "8P"));

    return {
      tonicChord,
      ascendingScale,
      sortedInterval,
    };
  }

  createExercise({
    intervalId = "random",
    direction = "ascending",
    rootNote = "random",
    keyTonic = "none",
    scaleType = "major",
  } = {}) {
    if (!keyTonic || keyTonic === "none") {
      const interval =
        intervalId === "random"
          ? INTERVALS[Math.floor(Math.random() * INTERVALS.length)]
          : INTERVALS.find((i) => i.id === intervalId) || INTERVALS[6];

      const safeRandomPool = ROOT_POOL.slice(0, 16);
      const startNote =
        rootNote === "random"
          ? safeRandomPool[Math.floor(Math.random() * safeRandomPool.length)]
          : rootNote;

      const targetNote =
        direction === "descending"
          ? Tonal.Note.transpose(startNote, `-${interval.tonal}`)
          : Tonal.Note.transpose(startNote, interval.tonal);

      return {
        interval,
        direction,
        notes: [startNote, targetNote],
        playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
        keySignature: null,
        keyTonic: "none",
        scaleType,
      };
    }

    const scaleNotes = this._getScaleNotesInRange(keyTonic, scaleType);
    const validPairs = [];

    for (let i = 0; i < scaleNotes.length; i++) {
      for (let j = 0; j < scaleNotes.length; j++) {
        if (i === j) continue;
        const n1 = scaleNotes[i];
        const n2 = scaleNotes[j];
        const diff = Tonal.Note.midi(n2) - Tonal.Note.midi(n1);

        if (Math.abs(diff) < 1 || Math.abs(diff) > 12) continue;
        if (direction === "descending" && diff >= 0) continue;
        if ((direction === "ascending" || direction === "harmonic") && diff <= 0) continue;
        if (rootNote !== "random" && n1 !== rootNote) continue;

        const semitones = Math.abs(diff);
        const matchedInterval = INTERVALS.find((int) => int.semitones === semitones);
        if (!matchedInterval) continue;
        if (intervalId !== "random" && matchedInterval.id !== intervalId) continue;

        validPairs.push({
          interval: matchedInterval,
          notes: [n1, n2],
        });
      }
    }

    if (validPairs.length === 0) {
      return this.createExercise({
        intervalId,
        direction,
        rootNote: "random",
        keyTonic,
        scaleType,
      });
    }

    const chosen = validPairs[Math.floor(Math.random() * validPairs.length)];

    return {
      interval: chosen.interval,
      direction,
      notes: chosen.notes,
      playbackMode: direction === "harmonic" ? "harmonic" : "melodic",
      keySignature: this.getVexKeySignature(keyTonic, scaleType),
      keyTonic,
      scaleType,
    };
  }
}
