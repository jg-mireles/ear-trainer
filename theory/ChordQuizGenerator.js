// theory/ChordQuizGenerator.js
// Generates single-chord & inversion exercises using Tonal.js

export const CHORD_TYPES = [
  { id: "M", label: "Major", tonal: "", intervals: ["1P", "3M", "5P"], category: "triad" },
  { id: "m", label: "Minor", tonal: "m", intervals: ["1P", "3m", "5P"], category: "triad" },
  { id: "dim", label: "Diminished", tonal: "dim", intervals: ["1P", "3m", "5d"], category: "triad" },
  { id: "aug", label: "Augmented", tonal: "aug", intervals: ["1P", "3M", "5A"], category: "triad" },
  { id: "sus2", label: "Sus2", tonal: "sus2", intervals: ["1P", "2M", "5P"], category: "triad" },
  { id: "sus4", label: "Sus4", tonal: "sus4", intervals: ["1P", "4P", "5P"], category: "triad" },
  { id: "maj7", label: "Major 7th", tonal: "maj7", intervals: ["1P", "3M", "5P", "7M"], category: "seventh" },
  { id: "7", label: "Dominant 7th", tonal: "7", intervals: ["1P", "3M", "5P", "7m"], category: "seventh" },
  { id: "m7", label: "Minor 7th", tonal: "m7", intervals: ["1P", "3m", "5P", "7m"], category: "seventh" },
  { id: "m7b5", label: "Half-Dim 7th", tonal: "m7b5", intervals: ["1P", "3m", "5d", "7m"], category: "seventh" },
  { id: "dim7", label: "Diminished 7th", tonal: "dim7", intervals: ["1P", "3m", "5d", "7d"], category: "seventh" },
];

export const INVERSIONS = [
  { id: 0, label: "Root Position" },
  { id: 1, label: "1st Inversion" },
  { id: 2, label: "2nd Inversion" },
  { id: 3, label: "3rd Inversion (7ths)" },
];

const CLEAN_ROOTS = ["C3", "D3", "Eb3", "E3", "F3", "G3", "Ab3", "A3", "Bb3", "C4", "D4", "Eb4", "E4", "F4"];

export class ChordQuizGenerator {
  /**
   * Generates a single-chord exercise
   * @param {Object} opts
   * @param {string[]} opts.allowedChords - Array of chord IDs (e.g., ["M", "m", "dim", "aug"])
   * @param {number[]} opts.allowedInversions - Array of inversion numbers (e.g., [0] or [0, 1, 2])
   * @param {string} opts.playbackStyle - "harmonic" | "arp-up" | "arp-down"
   */
  createExercise({
    allowedChords = CHORD_TYPES.map((c) => c.id),
    allowedInversions = [0],
    playbackStyle = "harmonic",
  } = {}) {
    const pool = CHORD_TYPES.filter((c) => allowedChords.includes(c.id));
    const activePool = pool.length ? pool : CHORD_TYPES.slice(0, 4);
    const chordDef = activePool[Math.floor(Math.random() * activePool.length)];

    const rootNote = CLEAN_ROOTS[Math.floor(Math.random() * CLEAN_ROOTS.length)];
    const rootPitchClass = Tonal.Note.pitchClass(rootNote);

    // Build close-position root notes from exact intervals
    const rootVoicing = chordDef.intervals.map((ivl) => Tonal.Note.transpose(rootNote, ivl));

    // Filter valid inversions (3rd inversion only applies to 4-note 7th chords)
    const maxInv = rootVoicing.length - 1;
    const validInvs = allowedInversions.filter((inv) => inv >= 0 && inv <= maxInv);
    const inversion = validInvs.length
      ? validInvs[Math.floor(Math.random() * validInvs.length)]
      : 0;

    // Rotate lower voices up an octave for the chosen inversion
    const voicedNotes = [...rootVoicing];
    for (let i = 0; i < inversion; i++) {
      const bottom = voicedNotes.shift();
      voicedNotes.push(Tonal.Note.transpose(bottom, "8P"));
    }

    // Order notes according to playback style
    let playbackNotes = [...voicedNotes];
    if (playbackStyle === "arp-down") {
      playbackNotes = [...voicedNotes].reverse();
    }

    const invObj = INVERSIONS.find((inv) => inv.id === inversion) || INVERSIONS[0];
    const symbol = `${rootPitchClass}${chordDef.tonal}`;
    const bassPitchClass = Tonal.Note.pitchClass(voicedNotes[0]);
    const slashSymbol = inversion > 0 ? `${symbol}/${bassPitchClass}` : symbol;

    return {
      chordDef,
      inversion,
      inversionLabel: invObj.label,
      rootNote,
      symbol,
      slashSymbol,
      voicedNotes,     // Always bottom-to-top for staff notation
      playbackNotes,   // Ordered for audio playback
      playbackMode: playbackStyle === "harmonic" ? "harmonic" : "melodic",
      resolution: this.buildResolution(rootNote, chordDef),
    };
  }

  /**
   * Builds a natural target resolution chord (e.g., V7 -> I, vii°7 -> I, sus4 -> M)
   */
  buildResolution(rootNote, chordDef) {
    if (chordDef.id === "sus4" || chordDef.id === "sus2") {
      const targetNotes = ["1P", "3M", "5P"].map((ivl) => Tonal.Note.transpose(rootNote, ivl));
      const tonic = Tonal.Note.pitchClass(rootNote);
      return { label: `${tonic} Major`, notes: targetNotes };
    }
    if (chordDef.id === "7") {
      const tonicRoot = Tonal.Note.transpose(rootNote, "4P");
      const tonic = Tonal.Note.pitchClass(tonicRoot);
      const targetNotes = ["1P", "3M", "5P"].map((ivl) => Tonal.Note.transpose(tonicRoot, ivl));
      return { label: `${tonic} Major (I)`, notes: targetNotes };
    }
    if (chordDef.id === "dim" || chordDef.id === "dim7" || chordDef.id === "m7b5") {
      const tonicRoot = Tonal.Note.transpose(rootNote, "2m");
      const tonic = Tonal.Note.pitchClass(tonicRoot);
      const targetNotes = ["1P", "3M", "5P"].map((ivl) => Tonal.Note.transpose(tonicRoot, ivl));
      return { label: `${tonic} Major (I)`, notes: targetNotes };
    }
    return null;
  }
}
