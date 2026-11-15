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
    const scale = Tonal.Scale.get(`${keyTonic} ${modeName}`);
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

  _generateLegalSATBVoicings(chordSymbol, leadingToneChroma) {
    const info = Tonal.Chord.get(chordSymbol);
    const tones = info.notes || [];
    if (tones.length < 3) return [];

    const rootPc = tones[0];
    const thirdPc = tones[1];
    const fifthPc = tones[2];
    const seventhPc = tones[3] || null;

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
          if (a.midi < t.midi || a.midi - t.midi > 12) continue;
          for (const s of sopranoPool) {
            if (s.midi < a.midi || s.midi - a.midi > 12) continue;

            const chosen = [b, t, a, s];
            const chromas = chosen.map((v) => Tonal.Note.chroma(v.note));

            const ltCount = chromas.filter((c) => c === leadingToneChroma).length;
            if (ltCount > 1) continue;

            const required = seventhPc
              ? [rootPc, thirdPc, seventhPc]
              : [rootPc, thirdPc, fifthPc];
            const reqChromas = required.map((pc) => Tonal.Note.chroma(pc));
            const hasAllRequired = reqChromas.every((rc) => chromas.includes(rc));
            if (!hasAllRequired) continue;

            let internalPenalty = 0;
            if (!seventhPc) {
              const thirdChroma = Tonal.Note.chroma(thirdPc);
              const thirdCount = chromas.filter((c) => c === thirdChroma).length;
              if (thirdCount > 1) internalPenalty += 12;
            } else if (chromas.includes(Tonal.Note.chroma(fifthPc))) {
              internalPenalty -= 1;
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

  _evaluateTransition(prev, curr, leadingToneChroma, tonicChroma) {
    let cost = curr.internalPenalty;
    const ruleChecks = [];
    const voiceExplanations = [];

    if (
      curr.midis[1] < prev.midis[0] ||
      curr.midis[2] < prev.midis[1] ||
      curr.midis[3] < prev.midis[2] ||
      curr.midis[1] > prev.midis[2] ||
      curr.midis[2] > prev.midis[3]
    ) {
      cost += 200;
    }

    let parallelViolation = false;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const diff1 = (prev.midis[j] - prev.midis[i]) % 12;
        const diff2 = (curr.midis[j] - curr.midis[i]) % 12;
        const moveI = curr.midis[i] - prev.midis[i];
        const moveJ = curr.midis[j] - prev.midis[j];

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
        if (delta === 0) reason = "Pedal / common bass retained";
        else if (Math.abs(delta) <= 2) reason = `Stepwise bass (${delta > 0 ? "up" : "down"})`;
        else reason = `Root motion (${delta > 0 ? "+" : ""}${delta} st)`;
      } else {
        upperMotionTotal += Math.abs(delta);
        if (Math.abs(delta) === 6 || Math.abs(delta) > 7) {
          cost += 45;
        }

        if (prevChroma === leadingToneChroma && currChroma === tonicChroma && delta === 1) {
          cost -= 8;
          reason = "Leading tone (7̂) resolves up by half-step to tonic";
        } else if (prevChroma === leadingToneChroma && v === 3 && currChroma !== tonicChroma) {
          cost += 50;
          reason = "Soprano leap from leading tone";
        } else if (prev.seventhChroma !== null && prevChroma === prev.seventhChroma) {
          if (delta === -1 || delta === -2) {
            cost -= 8;
            reason = "Chordal 7th resolves down by step";
          } else if (delta === 0) {
            reason = "Chordal 7th held as common tone";
          } else {
            cost += 45;
            reason = "Chordal 7th leap";
          }
        } else if (delta === 0) {
          cost -= 4;
          commonTonesHeld++;
          reason = "Common tone held stationary";
        } else if (Math.abs(delta) <= 2) {
          cost -= 2;
          reason = `Smooth step ${delta > 0 ? "up" : "down"} (${Math.abs(delta) === 1 ? "half-step" : "whole-step"})`;
        } else {
          reason = `Chord-tone leap (${delta > 0 ? "up" : "down"})`;
        }
      }

      voiceExplanations.push({
        voice: VOICE_NAMES[v],
        from: fromNote,
        to: toNote,
        reason,
      });
    }

    cost += upperMotionTotal * 2;

    if (commonTonesHeld > 0) {
      ruleChecks.push(`✓ ${commonTonesHeld} common tone${commonTonesHeld > 1 ? "s" : ""} retained`);
    }
    if (bassMove !== 0 && sopMove !== 0 && Math.sign(bassMove) !== Math.sign(sopMove)) {
      ruleChecks.push("✓ Contrary motion between Bass & Soprano");
    }

    return { cost, voiceExplanations, ruleChecks };
  }

  _solveProgressionSATB(steps, tonic, scaleType) {
    const tonicChroma = Tonal.Note.chroma(tonic);
    const leadingToneChroma = (tonicChroma + 11) % 12;

    const candidatesPerStep = steps.map((s) =>
      this._generateLegalSATBVoicings(s.symbol, leadingToneChroma)
    );

    if (candidatesPerStep.some((list) => list.length === 0)) {
      return steps.map((s) => ({
        ...s,
        voices: Tonal.Chord.get(s.symbol).notes.map((n, i) => `${n}${i === 0 ? 3 : 4}`),
        transition: null,
      }));
    }

    const dpCost = candidatesPerStep.map((list) => new Array(list.length).fill(Infinity));
    const dpBack = candidatesPerStep.map((list) => new Array(list.length).fill(-1));
    const dpInfo = candidatesPerStep.map((list) => new Array(list.length).fill(null));

    candidatesPerStep[0].forEach((cand, idx) => {
      const idealDist = Math.abs(cand.midis[3] - 69) + Math.abs(cand.midis[0] - 48);
      dpCost[0][idx] = cand.internalPenalty + idealDist * 0.5;
    });

    for (let stepIdx = 1; stepIdx < steps.length; stepIdx++) {
      const prevList = candidatesPerStep[stepIdx - 1];
      const currList = candidatesPerStep[stepIdx];

      for (let cIdx = 0; cIdx < currList.length; cIdx++) {
        for (let pIdx = 0; pIdx < prevList.length; pIdx++) {
          if (dpCost[stepIdx - 1][pIdx] === Infinity) continue;
          const evalRes = this._evaluateTransition(
            prevList[pIdx],
            currList[cIdx],
            leadingToneChroma,
            tonicChroma
          );
          const total = dpCost[stepIdx - 1][pIdx] + evalRes.cost;
          if (total < dpCost[stepIdx][cIdx]) {
            dpCost[stepIdx][cIdx] = total;
            dpBack[stepIdx][cIdx] = pIdx;
            dpInfo[stepIdx][cIdx] = evalRes;
          }
        }
      }
    }

    const lastStep = steps.length - 1;
    let bestIdx = 0;
    for (let i = 1; i < dpCost[lastStep].length; i++) {
      if (dpCost[lastStep][i] < dpCost[lastStep][bestIdx]) {
        bestIdx = i;
      }
    }

    const solved = new Array(steps.length);
    let cursor = bestIdx;
    for (let s = lastStep; s >= 0; s--) {
      solved[s] = {
        ...steps[s],
        voices: candidatesPerStep[s][cursor].voices,
        transition: s > 0 ? dpInfo[s][cursor] : null,
      };
      cursor = dpBack[s][cursor];
    }

    return solved;
  }

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

    const sortedNotes = [...exercise.notes].sort(
      (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
    );
    const pc1 = Tonal.Note.pitchClass(sortedNotes[0]);
    const pc2 = Tonal.Note.pitchClass(sortedNotes[1]);
    const chroma1 = Tonal.Note.chroma(pc1);
    const chroma2 = Tonal.Note.chroma(pc2);

    const matches = [];

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

          const singleSolved = this._solveProgressionSATB(
            [{ symbol, roman, isTarget: true }],
            tonic,
            scaleType
          )[0];

          const progressions = rawProgs.map((p) => {
            const rawSteps = p.degrees.map((degNum) => {
              const stepDegObj = degreeTable[degNum - 1];
              const stepRoot = scaleNotes[degNum - 1];
              const isTargetDeg = degNum === degObj.degree;
              const stepSuffix = isTargetDeg
                ? suffix
                : degNum === 5 && scaleType === "major"
                ? "7"
                : stepDegObj.triadSuffix;
              return {
                symbol: `${stepRoot}${stepSuffix}`,
                roman: isTargetDeg ? roman : stepDegObj.roman,
                isTarget: isTargetDeg,
              };
            });

            return {
              label: p.label,
              steps: this._solveProgressionSATB(rawSteps, tonic, scaleType),
            };
          });

          matches.push({
            id: `${symbol}-${tier}`,
            symbol,
            roman,
            tier,
            roleDesc,
            voices: singleSolved.voices,
            progressions,
          });
        }
      });
    });

    return {
      keyLabel: exercise.activeKeyLabel || `${tonic} ${scaleType}`,
      chords: matches.slice(0, 3),
    };
  }
}
