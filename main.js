// main.js
// Orchestrates Audio, Theory, Notation, and UI modules

import { SoundEngine } from "./audio/SoundEngine.js?v=29";
import { IntervalGenerator, INTERVALS } from "./theory/IntervalGenerator.js?v=29";
import { StaffRenderer } from "./notation/StaffRenderer.js?v=29";
import { ControlsPanel } from "./ui/ControlsPanel.js?v=29";
import { HarmonyContextDrawer } from "./ui/HarmonyContextDrawer.js?v=29";

const statusBadge = document.getElementById("status-badge");
const feedbackText = document.getElementById("feedback-text");
const quizGrid = document.getElementById("quiz-grid");
const contextBtn = document.getElementById("btn-context");
const harmonyContainer = document.getElementById("harmony-context-container");

// 1. Initialize Core Modules
const engine = new SoundEngine(() => {
  statusBadge.textContent = "Piano Samples Ready";
});
const generator = new IntervalGenerator();
const staff = new StaffRenderer("staff-container");

// Draw initial Piano Grand Staff with C Major right away
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

// Plays and draws in sync:
// 1) Tonic Triad -> 2) 1-Octave Ascending Scale -> 3) Exercise Interval (Low -> High)
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

  // 1. Tonic Triad (Audio + Grand Staff)
  feedbackText.textContent = `Context 1/3 — Tonic Triad (${seq.triad.join(" - ")})`;
  staff.renderNotes(seq.triad, "harmonic", keySig);
  engine.playChord(seq.triad, {
    mode: "harmonic",
    duration: chordDuration,
  });

  // 2. 1-Octave Ascending Scale (Audio + Grand Staff)
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

  // 3. Target Exercise Interval Lower -> Higher (Audio + Grand Staff)
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

// 2. Initialize Collapsible Harmony Context Drawer
const harmonyDrawer = new HarmonyContextDrawer(harmonyContainer, {
  onPlayChord: async (chordObj) => {
    if (!currentExercise || !chordObj) return;
    clearPlaybackTimers();
    await ensureAudioReady();

    const beat = controls.getStaggerSeconds();
    feedbackText.textContent = `Chord Context — ${chordObj.symbol} (${chordObj.roman}): ${chordObj.roleDesc}`;
    staff.renderNotes(chordObj.notes, "harmonic", currentExercise.keySignature);
    engine.playChord(chordObj.notes, {
      mode: "harmonic",
      duration: Math.max(1.4, beat * 2),
    });
  },
  onPlayProgression: async (prog) => {
    if (!currentExercise || !prog) return;
    clearPlaybackTimers();
    await ensureAudioReady();

    const stepSec = Math.max(0.75, controls.getStaggerSeconds() * 1.4);
    const keySig = currentExercise.keySignature;

    prog.steps.forEach((step, idx) => {
      const timerId = setTimeout(() => {
        const star = step.isTarget ? " ★ (Contains your interval)" : "";
        feedbackText.textContent = `Progression (${prog.label}) — ${step.symbol} (${step.roman})${star}`;
        staff.renderNotes(step.notes, "harmonic", keySig);
        engine.playChord(step.notes, {
          mode: "harmonic",
          duration: stepSec * 0.92,
        });
      }, idx * stepSec * 1000);

      playbackTimers.push(timerId);
    });
  },
});

// 3. Initialize Controls Panel
const controls = new ControlsPanel(
  document.getElementById("controls-container"),
  engine.synth,
  {
    onKeyChange: (keyTonic, scaleType) => {
      clearPlaybackTimers();
      harmonyDrawer.reset();
      if (keyTonic === "random") {
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

      // Immediately draw the active key signature (sharps/flats) on the Piano Grand Staff
      staff.renderEmptyStaff(currentExercise.keySignature);
      contextBtn.classList.add("hidden");

      const roleLabel =
        opts.direction === "descending" ? "Higher Note" : "Lower Note";
      feedbackText.textContent = `Key: ${currentExercise.activeKeyLabel} (Tonic ${currentExercise.activeKeyTonic} = ${roleLabel}) — Listen and identify...`;

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

// 4. Build Interval Answer Buttons
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
    feedbackText.textContent = `Not quite (${btn.textContent}) [Active Key: ${currentExercise.activeKeyLabel}]. Try again or click Reveal on Staff.`;
  }
}

contextBtn.addEventListener("click", playContextSequence);

buildQuizButtons();
