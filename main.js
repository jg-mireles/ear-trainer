// main.js
// Orchestrates Audio, Theory, Notation, and UI modules

import { SoundEngine } from "./audio/SoundEngine.js?v=31";
import { IntervalGenerator, INTERVALS } from "./theory/IntervalGenerator.js?v=31";
import { StaffRenderer } from "./notation/StaffRenderer.js?v=31";
import { ControlsPanel } from "./ui/ControlsPanel.js?v=31";
import { HarmonyContextDrawer } from "./ui/HarmonyContextDrawer.js?v=31";

const statusBadge = document.getElementById("status-badge");
const feedbackText = document.getElementById("feedback-text");
const quizGrid = document.getElementById("quiz-grid");
const contextBtn = document.getElementById("btn-context");
const harmonyContainer = document.getElementById("harmony-context-container");

const engine = new SoundEngine(() => {
  statusBadge.textContent = "Piano Samples Ready";
});
const generator = new IntervalGenerator();
const staff = new StaffRenderer("staff-container");

staff.renderEmptyStaff(generator.getVexKeySignature("C", "major"));

let currentExercise = null;
let lastOptions = null;
let playbackTimers = [];

function clearPlaybackTimers() {
  playbackTimers.forEach((id) => clearTimeout(id));
  playbackTimers = [];
}

function playMetronomeClick(time) {
  const ctx = Tone.context.rawContext;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.15, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

async function ensureAudioReady() {
  await Tone.start();
  if (engine.synth?.ctx?.state === "suspended") {
    await engine.synth.ctx.resume();
  }
  if (controls) {
    engine.setMode(controls.state.soundMode);
    engine.setTuning(controls.state.tuning);
  }
}

async function playCurrentExercise(opts) {
  if (!currentExercise) return;
  clearPlaybackTimers();
  await ensureAudioReady();

  const stagger = opts.stagger;
  const delayBeforeNotes = opts.metronomeClick ? stagger * 2 : 0;

  if (opts.metronomeClick) {
    const now = Tone.context.rawContext.currentTime;
    playMetronomeClick(now);
    playMetronomeClick(now + stagger);
  }

  const timerId = setTimeout(() => {
    engine.playChord(currentExercise.notes, {
      mode: currentExercise.playbackMode,
      stagger,
      duration: Math.max(1.1, stagger * 1.2),
    });
  }, delayBeforeNotes * 1000);

  playbackTimers.push(timerId);
}

async function playContextSequence() {
  if (!currentExercise) return;
  clearPlaybackTimers();
  await ensureAudioReady();

  const stagger = controls.getStaggerSeconds();
  const seq = generator.getContextSequence(currentExercise);
  const keySig = currentExercise.keySignature;

  const chordDuration = stagger * 2;
  const scaleStepSec = Math.max(0.24, stagger * 0.5);
  const scaleTotalSec = seq.ascendingScale.length * scaleStepSec;
  const pauseAfterChord = 0.25;
  const pauseAfterScale = 0.35;

  feedbackText.textContent = `Context 1/3 — Tonic Triad (${seq.triad.join(" - ")})`;
  staff.renderNotes(seq.triad, "harmonic", keySig);
  engine.playChord(seq.triad, {
    mode: "harmonic",
    duration: chordDuration,
  });

  const scaleTimer = setTimeout(() => {
    feedbackText.textContent = `Context 2/3 — Ascending Scale (${seq.ascendingScale.join(" → ")})`;
    staff.renderNotes(seq.ascendingScale, "melodic", keySig);
    engine.playChord(seq.ascendingScale, {
      mode: "melodic",
      stagger: scaleStepSec,
      duration: scaleStepSec * 0.9,
      allowShort: true,
    });
  }, (chordDuration + pauseAfterChord) * 1000);
  playbackTimers.push(scaleTimer);

  const intervalTimer = setTimeout(() => {
    feedbackText.textContent = `Context 3/3 — Target Interval: ${currentExercise.interval.name} (${seq.intervalAscending.join(" → ")}) [${currentExercise.activeKeyLabel}]`;
    staff.renderNotes(seq.intervalAscending, "melodic", keySig);
    engine.playChord(seq.intervalAscending, {
      mode: "melodic",
      stagger,
      duration: Math.max(1.1, stagger * 1.2),
    });
  }, (chordDuration + pauseAfterChord + scaleTotalSec + pauseAfterScale) * 1000);
  playbackTimers.push(intervalTimer);
}

const harmonyDrawer = new HarmonyContextDrawer(harmonyContainer, {
  onPlayChord: async (chordObj) => {
    if (!currentExercise || !chordObj) return;
    clearPlaybackTimers();
    await ensureAudioReady();

    const beat = controls.getStaggerSeconds();
    const activeSig = chordObj.keySignature || currentExercise.keySignature;
    feedbackText.textContent = `4-Part Chord — ${chordObj.symbol} (${chordObj.roman}): ${chordObj.roleDesc}`;
    staff.renderProgressionSATB([chordObj], 0, activeSig);
    engine.playChord(chordObj.voices, {
      mode: "harmonic",
      duration: Math.max(1.4, beat * 2),
    });
  },
  onPlayProgression: async (prog) => {
    if (!currentExercise || !prog) return;
    clearPlaybackTimers();
    await ensureAudioReady();

    const stepSec = Math.max(0.85, controls.getStaggerSeconds() * 1.45);
    const activeSig = prog.keySignature || currentExercise.keySignature;

    prog.steps.forEach((step, idx) => {
      const timerId = setTimeout(() => {
        const star = step.isTarget ? " ★ (Target interval)" : "";
        feedbackText.textContent = `Bar ${idx + 1}/${prog.steps.length} (${prog.label}) — ${step.symbol} (${step.roman})${star}`;

        const visibleBars = prog.steps.slice(0, idx + 1);
        staff.renderProgressionSATB(visibleBars, idx, activeSig);

        engine.playChord(step.voices, {
          mode: "harmonic",
          duration: stepSec * 0.92,
        });

        if (idx === prog.steps.length - 1) {
          const finishTimer = setTimeout(() => {
            staff.renderProgressionSATB(prog.steps, -1, activeSig);
          }, stepSec * 950);
          playbackTimers.push(finishTimer);
        }
      }, idx * stepSec * 1000);

      playbackTimers.push(timerId);
    });
  },
});

const controls = new ControlsPanel(
  document.getElementById("controls-container"),
  engine.synth,
  {
    onKeyChange: (keyTonic, scaleType) => {
      clearPlaybackTimers();
      harmonyDrawer.reset();
      if (keyTonic === "chromatic") {
        staff.setKeySignature(null);
        feedbackText.textContent = "Fully Chromatic active — any starting note & interval. Click 'New Interval' to start.";
      } else if (keyTonic === "random") {
        staff.setKeySignature(null);
        feedbackText.textContent = "Random Key active — click 'New Interval' to draw a key.";
      } else {
        const vexSig = generator.getVexKeySignature(keyTonic, scaleType);
        staff.setKeySignature(vexSig);
        const label = generator.getKeyDisplayName(keyTonic, scaleType);
        feedbackText.textContent = `Selected Key: ${label} (Tonic = ${keyTonic}) — click 'New Interval' to start.`;
      }
    },
    onNewExercise: (opts) => {
      clearPlaybackTimers();
      harmonyDrawer.reset();
      lastOptions = opts;
      currentExercise = generator.createExercise({
        allowedIntervals: opts.allowedIntervals,
        direction: opts.direction,
        keyTonic: opts.keyTonic,
        scaleType: opts.scaleType,
      });

      staff.renderEmptyStaff(currentExercise.keySignature);
      contextBtn.classList.add("hidden");

      if (currentExercise.isChromatic) {
        feedbackText.textContent = "Fully Chromatic (No fixed key) — Listen and identify the interval...";
      } else {
        const roleLabel =
          opts.direction === "descending" ? "Higher Note" : "Lower Note";
        feedbackText.textContent = `Key: ${currentExercise.activeKeyLabel} (Tonic ${currentExercise.activeKeyTonic} = ${roleLabel}) — Listen and identify...`;
      }

      resetQuizButtons();
      playCurrentExercise(opts);
    },
    onRepeat: (opts) => {
      if (!currentExercise) return;
      lastOptions = opts;
      playCurrentExercise(opts);
    },
    onReveal: () => {
      if (!currentExercise) return;
      revealAnswer();
    },
    onModeChange: (mode) => {
      engine.setMode(mode);
    },
    onTuningChange: (tuningId) => {
      engine.setTuning(tuningId);
    },
  }
);

function buildQuizButtons() {
  quizGrid.innerHTML = INTERVALS.map(
    (int) => `<button type="button" class="quiz-btn" data-id="${int.id}">${int.name}</button>`
  ).join("");

  quizGrid.querySelectorAll(".quiz-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleGuess(btn));
  });
}

function resetQuizButtons() {
  quizGrid.querySelectorAll(".quiz-btn").forEach((btn) => {
    btn.classList.remove("correct", "wrong");
  });
}

function revealAnswer() {
  if (!currentExercise) return;
  clearPlaybackTimers();
  feedbackText.textContent = `Answer: ${currentExercise.interval.name} (${currentExercise.notes.join(" → ")}) [${currentExercise.activeKeyLabel}]`;

  staff.renderNotes(
    currentExercise.notes,
    currentExercise.playbackMode,
    currentExercise.keySignature
  );

  contextBtn.classList.remove("hidden");
  harmonyDrawer.prepareForExercise(currentExercise);

  const correctBtn = quizGrid.querySelector(`.quiz-btn[data-id="${currentExercise.interval.id}"]`);
  if (correctBtn) correctBtn.classList.add("correct");
}

function handleGuess(btn) {
  if (!currentExercise) {
    feedbackText.textContent = "Click 'New Interval' first to start!";
    return;
  }

  const guessedId = btn.dataset.id;
  if (guessedId === currentExercise.interval.id) {
    btn.classList.add("correct");
    revealAnswer();
  } else {
    btn.classList.add("wrong");
    feedbackText.textContent = `Not quite (${btn.textContent}) [Mode: ${currentExercise.activeKeyLabel}]. Try again or click Reveal on Staff.`;
  }
}

contextBtn.addEventListener("click", playContextSequence);

buildQuizButtons();
