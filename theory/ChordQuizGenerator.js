// theory/ChordQuizGenerator.js
// Generates single-chord & inversion exercises with smooth voice-led resolutions & rule explanations

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
  { id: "dim7", label: "Diminished 7th", tonal: "dim7", intervals: ["1P", "3m", "5d", "7d"], category: "seventh" }
];

export const INVERSIONS = [
  { id: 0, label: "Root Position" },
  { id: 1, label: "1st Inversion" },
  { id: 2, label: "2nd Inversion" },
  { id: 3, label: "3rd Inversion (7ths)" }
];

const CLEAN_ROOTS = ["C3", "D3", "Eb3", "E3", "F3", "G3", "Ab3", "A3", "Bb3", "C4", "D4", "Eb4", "E4", "F4"];

export class ChordQuizGenerator {
  createExercise(options) {
    const opts = options || {};
    const allowedChords = opts.allowedChords || CHORD_TYPES.map((c) => c.id);
    const allowedInversions = opts.allowedInversions || [0];
    const playbackStyle = opts.playbackStyle || "harmonic";

    const pool = CHORD_TYPES.filter((c) => allowedChords.includes(c.id));
    const activePool = pool.length ? pool : CHORD_TYPES.slice(0, 4);
    const chordDef = activePool[Math.floor(Math.random() * activePool.length)];

    const rootNote = CLEAN_ROOTS[Math.floor(Math.random() * CLEAN_ROOTS.length)];
    const rootPitchClass = Tonal.Note.pitchClass(rootNote);
    const rootVoicing = chordDef.intervals.map((ivl) => Tonal.Note.transpose(rootNote, ivl));

    const maxInv = rootVoicing.length - 1;
    const validInvs = allowedInversions.filter((inv) => inv >= 0 && inv <= maxInv);
    const inversion = validInvs.length
      ? validInvs[Math.floor(Math.random() * validInvs.length)]
      : 0;

    const voicedNotes = [...rootVoicing];
    for (let i = 0; i < inversion; i++) {
      const bottom = voicedNotes.shift();
      voicedNotes.push(Tonal.Note.transpose(bottom, "8P"));
    }

    const playbackNotes = playbackStyle === "arp-down"
      ? [...voicedNotes].reverse()
      : [...voicedNotes];

    const invObj = INVERSIONS.find((inv) => inv.id === inversion) || INVERSIONS[0];
    const symbol = rootPitchClass + chordDef.tonal;
    const bassPitchClass = Tonal.Note.pitchClass(voicedNotes[0]);
    const slashSymbol = inversion > 0 ? symbol + "/" + bassPitchClass : symbol;

    return {
      chordDef: chordDef,
      inversion: inversion,
      inversionLabel: invObj.label,
      rootNote: rootNote,
      symbol: symbol,
      slashSymbol: slashSymbol,
      voicedNotes: voicedNotes,
      playbackNotes: playbackNotes,
      playbackMode: playbackStyle === "harmonic" ? "harmonic" : "melodic",
      resolution: this.buildResolution(rootNote, chordDef, voicedNotes)
    };
  }

  buildResolution(rootNote, chordDef, voicedNotes) {
    let targetRoot = null;
    let targetLabel = "";

    if (chordDef.id === "sus4" || chordDef.id === "sus2") {
      targetRoot = rootNote;
      targetLabel = Tonal.Note.pitchClass(targetRoot) + " Major (I)";
    } else if (chordDef.id === "7" || chordDef.id === "aug") {
      targetRoot = Tonal.Note.transpose(rootNote, "4P");
      targetLabel = Tonal.Note.pitchClass(targetRoot) + " Major (I)";
    } else if (chordDef.id === "dim" || chordDef.id === "dim7" || chordDef.id === "m7b5") {
      targetRoot = Tonal.Note.transpose(rootNote, "2m");
      targetLabel = Tonal.Note.pitchClass(targetRoot) + " Major (I)";
    } else {
      return null;
    }

    const tonicPc = Tonal.Note.pitchClass(targetRoot);
    const thirdPc = Tonal.Note.pitchClass(Tonal.Note.transpose(targetRoot, "3M"));
    const fifthPc = Tonal.Note.pitchClass(Tonal.Note.transpose(targetRoot, "5P"));
    const targetPcs = [tonicPc, thirdPc, fifthPc];

    const rootChroma = Tonal.Note.chroma(rootNote);
    const thirdChroma = Tonal.Note.chroma(Tonal.Note.transpose(rootNote, chordDef.intervals[1]));
    const fifthChroma = Tonal.Note.chroma(Tonal.Note.transpose(rootNote, chordDef.intervals[2]));
    const seventhChroma = chordDef.intervals[3]
      ? Tonal.Note.chroma(Tonal.Note.transpose(rootNote, chordDef.intervals[3]))
      : null;

    const voiceNames = voicedNotes.length === 4
      ? ["Bass", "Tenor", "Alto", "Soprano"]
      : ["Bass", "Middle Voice", "Soprano"];

    const resolvedNotes = [];
    const voiceExplanations = [];
    let commonTones = 0;

    voicedNotes.forEach((fromNote, idx) => {
      const fromMidi = Tonal.Note.midi(fromNote);
      const fromChroma = Tonal.Note.chroma(fromNote);

      let bestNote = fromNote;
      let bestDist = Infinity;

      targetPcs.forEach((pc) => {
        if (idx === 0 && pc !== tonicPc && pc !== thirdPc) return;
        for (let oct = 2; oct <= 6; oct++) {
          const cand = pc + String(oct);
          const m = Tonal.Note.midi(cand);
          if (m === null) continue;
          const dist = Math.abs(m - fromMidi);
          const bassRootBonus = idx === 0 && pc === tonicPc ? -3 : 0;
          if (dist + bassRootBonus < bestDist) {
            bestDist = dist + bassRootBonus;
            bestNote = cand;
          }
        }
      });

      resolvedNotes.push(bestNote);
      const delta = Tonal.Note.midi(bestNote) - fromMidi;

      let reason = "";
      if (chordDef.id === "sus4" && fromChroma === thirdChroma) {
        reason = "Suspended 4th resolves down by half-step to Major 3rd";
      } else if (chordDef.id === "sus2" && fromChroma === thirdChroma) {
        reason = "Suspended 2nd resolves up by whole-step to Major 3rd";
      } else if (chordDef.id === "aug" && fromChroma === fifthChroma) {
        reason = "Raised 5th (#5) resolves up by half-step to 3rd of tonic";
      } else if (seventhChroma !== null && fromChroma === seventhChroma) {
        reason = "Chordal 7th resolves down by step to 3rd of tonic";
      } else if (
        (chordDef.id === "7" && fromChroma === thirdChroma) ||
        (["dim", "dim7", "m7b5"].includes(chordDef.id) && fromChroma === rootChroma)
      ) {
        reason = "Leading tone (7th degree) resolves up by half-step to tonic";
      } else if (
        ["dim", "dim7", "m7b5"].includes(chordDef.id) &&
        fromChroma === fifthChroma
      ) {
        reason = "Diminished 5th (tritone) contracts inward down by step";
      } else if (delta === 0) {
        commonTones++;
        reason = "Common tone held stationary";
      } else if (idx === 0) {
        reason = Math.abs(delta) <= 2
          ? "Stepwise bass resolution (" + (delta > 0 ? "up" : "down") + ")"
          : "Authentic bass root motion (" + (delta > 0 ? "+" : "") + String(delta) + " st)";
      } else {
        reason = "Smooth stepwise motion (" + (delta > 0 ? "up" : "down") + " " + String(Math.abs(delta)) + " st)";
      }

      voiceExplanations.push({
        voice: voiceNames[idx] || "Voice " + String(idx + 1),
        from: fromNote,
        to: bestNote,
        reason: reason
      });
    });

    const ruleChecks = [];
    let hasParallel = false;
    for (let i = 0; i < voicedNotes.length; i++) {
      for (let j = i + 1; j < voicedNotes.length; j++) {
        const d1 = (Tonal.Note.midi(voicedNotes[j]) - Tonal.Note.midi(voicedNotes[i])) % 12;
        const d2 = (Tonal.Note.midi(resolvedNotes[j]) - Tonal.Note.midi(resolvedNotes[i])) % 12;
        const m1 = Tonal.Note.midi(resolvedNotes[i]) - Tonal.Note.midi(voicedNotes[i]);
        const m2 = Tonal.Note.midi(resolvedNotes[j]) - Tonal.Note.midi(voicedNotes[j]);
        if (m1 !== 0 && Math.sign(m1) === Math.sign(m2) && (d1 === 7 || d1 === 0) && d1 === d2) {
          hasParallel = true;
        }
      }
    }
    if (!hasParallel) ruleChecks.push("No parallel 5ths or octaves");
    if (commonTones > 0) {
      ruleChecks.push(String(commonTones) + " common tone" + (commonTones > 1 ? "s" : "") + " retained");
    }

    const bassMove = Tonal.Note.midi(resolvedNotes[0]) - Tonal.Note.midi(voicedNotes[0]);
    const sopMove =
      Tonal.Note.midi(resolvedNotes[resolvedNotes.length - 1]) -
      Tonal.Note.midi(voicedNotes[voicedNotes.length - 1]);
    if (bassMove !== 0 && sopMove !== 0 && Math.sign(bassMove) !== Math.sign(sopMove)) {
      ruleChecks.push("Contrary motion between outer voices");
    }

    return {
      label: targetLabel,
      notes: resolvedNotes,
      voiceExplanations: voiceExplanations,
      ruleChecks: ruleChecks
    };
  }
}
