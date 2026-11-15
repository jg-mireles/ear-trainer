// theory/HarmonyFinder.js
// Finds diatonic triads & 7th chords containing both interval notes,
// solves 4-part SATB voice leading without parallel 5ths/8ves, and logs rule explanations

const MAJOR_DEGREES = [
  { degree: 1, roman: "I", triadSuffix: "", seventhSuffix: "maj7" },
  { degree: 2, roman: "ii", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 3, roman: "iii", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 4, roman: "IV", triadSuffix: "", seventhSuffix: "maj7" },
  { degree: 5, roman: "V", triadSuffix: "", seventhSuffix: "7" },
  { degree: 6, roman: "vi", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 7, roman: "vii°", triadSuffix: "dim", seventhSuffix: "m7b5" },
];

const MINOR_DEGREES = [
  { degree: 1, roman: "i", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 2, roman: "ii°", triadSuffix: "dim", seventhSuffix: "m7b5" },
  { degree: 3, roman: "III", triadSuffix: "", seventhSuffix: "maj7" },
  { degree: 4, roman: "iv", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 5, roman: "v", triadSuffix: "m", seventhSuffix: "m7" },
  { degree: 6, roman: "VI", triadSuffix: "", seventhSuffix: "maj7" },
  { degree: 7, roman: "VII", triadSuffix: "", seventhSuffix: "7" },
];

const MAJOR_PROGRESSIONS = {
  1: [
    { label: "I – V7 – vi – IV", degrees: [1, 5, 6, 4] },
    { label: "I – IV – V7 – I", degrees: [1, 4, 5, 1] },
  ],
  2: [
    { label: "ii7 – V7 – Imaj7", degrees: [2, 5, 1] },
    { label: "I – vi – ii7 – V7", degrees: [1, 6, 2, 5] },
  ],
  3: [
    { label: "I – iii – IV – V7", degrees: [1, 3, 4, 5] },
    { label: "iii – vi – ii – V7", degrees: [3, 6, 2, 5] },
  ],
  4: [
    { label: "IV – V7 – I", degrees: [4, 5, 1] },
    { label: "I – IV – vi – V7", degrees: [1, 4, 6, 5] },
  ],
  5: [
    { label: "ii – V7 – I", degrees: [2, 5, 1] },
    { label: "I – V7 – vi – IV", degrees: [1, 5, 6, 4] },
  ],
  6: [
    { label: "I – V7 – vi – IV", degrees: [1, 5, 6, 4] },
    { label: "vi – IV – I – V7", degrees: [6, 4, 1, 5] },
  ],
  7: [
    { label: "viiø7 – I", degrees: [7, 1] },
    { label: "IV – vii° – I", degrees: [4, 7, 1] },
  ],
};

const MINOR_PROGRESSIONS = {
  1: [
    { label: "i – VI – III – VII", degrees: [1, 6, 3, 7] },
    { label: "i – iv – v7 – i", degrees: [1, 4, 5, 1] },
  ],
  2: [
    { label: "iiø7 – v7 – i", degrees: [2, 5, 1] },
    { label: "i – iiø7 – v7 – i", degrees: [1, 2, 5, 1] },
  ],
  3: [
    { label: "i – VI – III – VII", degrees: [1, 6, 3, 7] },
    { label: "III – VI – iiø7 – v7", degrees: [3, 6, 2, 5] },
  ],
  4: [
    { label: "i – iv – VII – III", degrees: [1, 4, 7, 3] },
    { label: "iv – v7 – i", degrees: [4, 5, 1] },
  ],
  5: [
    { label: "i – iv – v7 – i", degrees: [1, 4, 5, 1] },
    { label: "i – VI – iv – v7", degrees: [1, 6, 4, 5] },
  ],
  6: [
    { label: "i – VI – III – VII", degrees: [1, 6, 3, 7] },
    { label: "VI – VII – i", degrees: [6, 7, 1] },
  ],
  7: [
    { label: "i – VII – VI – VII", degrees: [1, 7, 6, 7] },
    { label: "III – VII – i", degrees: [3, 7, 1] },
  ],
};

const ROLE_LABELS = ["Root", "3rd", "5th", "7th"];
const VOICE_NAMES = ["Bass", "Tenor", "Alto", "Soprano"];

// Vocal MIDI ranges: [Bass, Tenor, Alto, Soprano]
const VOICE_RANGES = [
  { min: 40, max: 60 }, // Bass: E2–C4
  { min: 48, max: 67 }, // Tenor: C3–G4
  { min: 55, max: 74 }, // Alto: G3–D5
  { min: 60, max: 79 }, // Soprano: C4–G5
];

export class HarmonyFinder {
  _getScaleNotes(keyTonic, scaleType) {
    const modeName = scaleType === "minor" ? "minor" : "major";
    const scale = Tonal.Scale.get(`${keyTonic}${modeName}`);
    return scale.notes || [];
  }

  _notesInRange(pitchClass, minMidi, maxMidi) {
    const out = [];
    for (let oct = 2; oct <= 6; oct++) {
      const candidate = `${pitchClass}${oct}`;
      const midi = Tonal.Note.midi(candidate);
      if (midi !== null && midi >= minMidi && midi <= maxMidi) {
        out.push({ note: candidate, midi });
      }
    }
    return out;
  }

  /**
   * Generates all legal 4-voice SATB chords [B, T, A, S] obeying range, doubling, and spacing rules
   */
  _generateLegalSATBVoicings(chordSymbol, leadingToneChroma) {
    const info = Tonal.Chord.get(chordSymbol);
    const tones = info.notes || [];
    if (tones.length < 3) return [];

    const rootPc = tones[0];
    const thirdPc = tones[1];
    const fifthPc = tones[2];
    const seventhPc = tones[3] || null;

    // Bass = root (keeps root-position functional clarity)
    const bassCandidates = this._notesInRange(rootPc, VOICE_RANGES[0].min, VOICE_RANGES[0].max);
    const tenorPool = tones.flatMap((pc) =>
      this._notesInRange(pc, VOICE_RANGES[1].min, VOICE_RANGES[1].max)
    );
    const altoPool = tones.flatMap((pc) =>
      this._notesInRange(pc, VOICE_RANGES[2].min, VOICE_RANGES[2].max)
    );
    const sopranoPool = tones.flatMap((pc) =>
      this._notesInRange(pc, VOICE_RANGES[3].min, VOICE_RANGES[3].max)
    );

    const legal = [];

    for (const b of bassCandidates) {
      for (const t of tenorPool) {
        if (t.midi < b.midi || t.midi - b.midi > 24) continue;
        for (const a of altoPool) {
          // Rule: No voice crossing & upper adjacent voices within 1 octave (<= 12 semitones)
          if (a.midi < t.midi || a.midi - t.midi > 12) continue;
          for (const s of sopranoPool) {
            if (s.midi < a.midi || s.midi - a.midi > 12) continue;

            const chosen = [b, t, a, s];
            const chromas = chosen.map((v) => Tonal.Note.chroma(v.note));

            // Rule: Never double the leading tone
            const ltCount = chromas.filter((c) => c === leadingToneChroma).length;
            if (ltCount > 1) continue;

            // Check chord completeness & doubling rules
            const required = seventhPc
              ? [rootPc, thirdPc, seventhPc] // 7th chord: allow omitting 5th if needed
              : [rootPc, thirdPc, fifthPc]; // Triad: require all 3 tones
            const reqChromas = required.map((pc) => Tonal.Note.chroma(pc));
            const hasAllRequired = reqChromas.every((rc) => chromas.includes(rc));
            if (!hasAllRequired) continue;

            // For triads, prefer doubling the root (or 5th) over doubling the 3rd
            let internalPenalty = 0;
            if (!seventhPc) {
              const thirdChroma = Tonal.Note.chroma(thirdPc);
              const thirdCount = chromas.filter((c) => c === thirdChroma).length;
              if (thirdCount > 1) internalPenalty += 12;
            } else if (chromas.includes(Tonal.Note.chroma(fifthPc))) {
              internalPenalty -= 1; // Slight bonus for complete 7th chord
            }

            legal.push({
              voices: chosen.map((v) => v.note),
              midis: chosen.map((v) => v.midi),
              seventhChroma: seventhPc ? Tonal.Note.chroma(seventhPc) : null,
              internalPenalty,
            });
          }
        }
      }
    }

    return legal;
  }

  /**
   * Scores transition prev -> curr using SATB part-writing rules and returns human-readable explanations
   */
  _evaluateTransition(prev, curr, leadingToneChroma, tonicChroma) {
    let cost = curr.internalPenalty;
    const ruleChecks = [];
    const voiceExplanations = [];

    // 1. Check Voice Overlap across adjacent voices
    if (
      curr.midis[1] < prev.midis[0] ||
      curr.midis[2] < prev.midis[1] ||
      curr.midis[3] < prev.midis[2] ||
      curr.midis[1] > prev.midis[2] ||
      curr.midis[2] > prev.midis[3]
    ) {
      cost += 200;
    }

    // 2. Check Parallel 5ths & Parallel Octaves/Unisons across all 6 voice pairs
    let parallelViolation = false;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const diff1 = (prev.midis[j] - prev.midis[i]) % 12;
        const diff2 = (curr.midis[j] - curr.midis[i]) % 12;
        const moveI = curr.midis[i] - prev.midis[i];
        const moveJ = curr.midis[j] - prev.midis[j];

        // Parallel motion (both move in the same direction, non-zero)
        if (moveI !== 0 && Math.sign(moveI) === Math.sign(moveJ)) {
          if (diff1 === 7 && diff2 === 7) {
            cost += 1000;
            parallelViolation = true;
          }
          if (diff1 === 0 && diff2 === 0) {
            cost += 1000;
            parallelViolation = true;
          }
        }
      }
    }

    if (!parallelViolation) {
      ruleChecks.push("✓ No parallel 5ths or octaves");
    }

    // 3. Direct (Hidden) 5ths/8ves in Outer Voices (Bass & Soprano)
    const bassMove = curr.midis[0] - prev.midis[0];
    const sopMove = curr.midis[3] - prev.midis[3];
    const outerInterval = (curr.midis[3] - curr.midis[0]) % 12;
    if (
      bassMove !== 0 &&
      Math.sign(bassMove) === Math.sign(sopMove) &&
      (outerInterval === 0 || outerInterval === 7) &&
      Math.abs(sopMove) > 2
    ) {
      cost += 60;
    }

    // 4. Analyze each voice's motion, common tones, and tendency-tone resolutions
    let upperMotionTotal = 0;
    let commonTonesHeld = 0;

    for (let v = 0; v < 4; v++) {
      const fromNote = prev.voices[v];
      const toNote = curr.voices[v];
      const delta = curr.midis[v] - prev.midis[v];
      const prevChroma = Tonal.Note.chroma(fromNote);
      const currChroma = Tonal.Note.chroma(toNote);

      let reason = "";

      if (v === 0) {
        // Bass line
        if (delta === 0) reason = "Pedal / common bass retained";
        else if (Math.abs(delta) <= 2) reason = `Stepwise bass (${delta > 0 ? "up" : "down"})`;
        else reason = `Root motion (${delta > 0 ? "+"
