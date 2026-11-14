// theory/HarmonyFinder.js
// Finds diatonic triads & 7th chords containing both exercise notes and builds common progressions

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

// Common 3- to 4-chord sequences (by 1-based scale degree) featuring a given degree
const MAJOR_PROGRESSIONS = {
  1: [
    { label: "I – V – vi – IV", degrees: [1, 5, 6, 4] },
    { label: "I – IV – V – I", degrees: [1, 4, 5, 1] },
  ],
  2: [
    { label: "ii7 – V7 – Imaj7", degrees: [2, 5, 1] },
    { label: "I – vi – ii7 – V7 – I", degrees: [1, 6, 2, 5, 1] },
  ],
  3: [
    { label: "I – iii – IV – V", degrees: [1, 3, 4, 5] },
    { label: "iii – vi – ii – V – I", degrees: [3, 6, 2, 5, 1] },
  ],
  4: [
    { label: "IV – V – I", degrees: [4, 5, 1] },
    { label: "I – IV – vi – V", degrees: [1, 4, 6, 5] },
  ],
  5: [
    { label: "ii – V7 – I", degrees: [2, 5, 1] },
    { label: "I – V7 – vi – IV", degrees: [1, 5, 6, 4] },
  ],
  6: [
    { label: "I – V – vi – IV", degrees: [1, 5, 6, 4] },
    { label: "vi – IV – I – V", degrees: [6, 4, 1, 5] },
  ],
  7: [
    { label: "viiø7 – I", degrees: [7, 1] },
    { label: "IV – vii° – I", degrees: [4, 7, 1] },
  ],
};

const MINOR_PROGRESSIONS = {
  1: [
    { label: "i – VI – III – VII", degrees: [1, 6, 3, 7] },
    { label: "i – iv – v – i", degrees: [1, 4, 5, 1] },
  ],
  2: [
    { label: "iiø7 – v7 – i", degrees: [2, 5, 1] },
    { label: "i – iiø7 – v7 – i", degrees: [1, 2, 5, 1] },
  ],
  3: [
    { label: "i – VI – III – VII", degrees: [1, 6, 3, 7] },
    { label: "III – VI – iiø7 – v7 – i", degrees: [3, 6, 2, 5, 1] },
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

export class HarmonyFinder {
  _getScaleNotes(keyTonic, scaleType) {
    const modeName = scaleType === "minor" ? "minor" : "major";
    const scale = Tonal.Scale.get(`${keyTonic} ${modeName}`);
    return scale.notes || [];
  }

  _buildPlayableVoicing(chordSymbol, isSeventh = false) {
    const info = Tonal.Chord.get(chordSymbol);
    const tones = info.notes || [];
    if (tones.length === 0) return [];

    // Place root in octave 3 (C3–B3) and stack upward cleanly for the Grand Staff
    let prevMidi = Tonal.Note.midi(`${tones[0]}3`);
    const voiced = [`${tones[0]}3`];

    for (let i = 1; i < tones.length; i++) {
      let candidate = `${tones[i]}3`;
      if (Tonal.Note.midi(candidate) <= prevMidi) {
        candidate = `${tones[i]}4`;
      }
      if (Tonal.Note.midi(candidate) <= prevMidi) {
        candidate = `${tones[i]}5`;
      }
      voiced.push(candidate);
      prevMidi = Tonal.Note.midi(candidate);
    }

    return voiced;
  }

  /**
   * Returns up to 3 diatonic chords (triads first, then 7th chords) containing both interval notes,
   * along with playable voicings and 2 common progressions per chord.
   */
  analyzeExercise(exercise) {
    if (!exercise || !exercise.notes || exercise.notes.length < 2) {
      return { chords: [] };
    }

    const tonic = exercise.activeKeyTonic || Tonal.Note.pitchClass(exercise.notes[0]);
    const scaleType = exercise.scaleType || "major";
    const scaleNotes = this._getScaleNotes(tonic, scaleType);
    if (scaleNotes.length < 7) return { chords: [] };

    const degreeTable = scaleType === "minor" ? MINOR_DEGREES : MAJOR_DEGREES;
    const progTable = scaleType === "minor" ? MINOR_PROGRESSIONS : MAJOR_PROGRESSIONS;

    // Sort exercise notes low -> high so role descriptions match ascending pitch order
    const sortedNotes = [...exercise.notes].sort(
      (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
    );
    const pc1 = Tonal.Note.pitchClass(sortedNotes[0]);
    const pc2 = Tonal.Note.pitchClass(sortedNotes[1]);
    const chroma1 = Tonal.Note.chroma(pc1);
    const chroma2 = Tonal.Note.chroma(pc2);

    const matches = [];

    // Pass 1: Scan Diatonic Triads first, then Pass 2: Diatonic 7th Chords
    ["triad", "seventh"].forEach((tier) => {
      degreeTable.forEach((degObj, idx) => {
        const rootPc = scaleNotes[idx];
        const suffix = tier === "triad" ? degObj.triadSuffix : degObj.seventhSuffix;
        const symbol = `${rootPc}${suffix}`;
        const roman =
          tier === "seventh" && !degObj.roman.includes("7") && !degObj.roman.includes("ø")
            ? `${degObj.roman}7`
            : degObj.roman;

        const chordInfo = Tonal.Chord.get(symbol);
        const chordTones = chordInfo.notes || [];
        const chromas = chordTones.map((n) => Tonal.Note.chroma(n));

        const idx1 = chromas.indexOf(chroma1);
        const idx2 = chromas.indexOf(chroma2);

        if (idx1 !== -1 && idx2 !== -1) {
          const roleDesc = `${pc1} (${ROLE_LABELS[idx1] || "tone"}) + ${pc2} (${ROLE_LABELS[idx2] || "tone"})`;
          const rawProgs = progTable[degObj.degree] || [];

          const progressions = rawProgs.map((p) => {
            const steps = p.degrees.map((degNum) => {
              const stepDegObj = degreeTable[degNum - 1];
              const stepRoot = scaleNotes[degNum - 1];
              // Use the matching chord's quality on its own degree; use clean triads/V7 for neighbors
              const isTargetDeg = degNum === degObj.degree;
              const stepSuffix = isTargetDeg
                ? suffix
                : degNum === 5 && scaleType === "major"
                ? "7"
                : stepDegObj.triadSuffix;
              const stepSymbol = `${stepRoot}${stepSuffix}`;
              return {
                symbol: stepSymbol,
                roman: isTargetDeg ? roman : stepDegObj.roman,
                isTarget: isTargetDeg,
                notes: this._buildPlayableVoicing(stepSymbol, tier === "seventh"),
              };
            });

            return {
              label: p.label,
              steps,
            };
          });

          matches.push({
            id: `${symbol}-${tier}`,
            symbol,
            roman,
            tier,
            roleDesc,
            notes: this._buildPlayableVoicing(symbol, tier === "seventh"),
            progressions,
          });
        }
      });
    });

    // Keep top 3 matches so the drawer stays compact and uncluttered
    return {
      keyLabel: exercise.activeKeyLabel || `${tonic} ${scaleType}`,
      chords: matches.slice(0, 3),
    };
  }
}
