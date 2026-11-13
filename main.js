// main.js
// Orchestrates Audio, Theory, Notation, and UI modules

import { SoundEngine } from "./audio/SoundEngine.js?v=18";
import { IntervalGenerator, INTERVALS } from "./theory/IntervalGenerator.js?v=18";
import { StaffRenderer } from "./notation/StaffRenderer.js?v=18";
import { ControlsPanel } from "./ui/ControlsPanel.js?v=18";

const statusBadge = document.getElementById("status-badge");
const feedbackText = document.getElementById("feedback-text");
const quizGrid = document.getElementById("quiz-grid");
const contextBtn = document.getElementById("btn-context");

// 1. Initialize Core Modules
const engine = new SoundEngine(() => {
  statusBadge.textContent = "Piano Samples Ready";
});
const generator = new IntervalGenerator();
const staff = new StaffRenderer("staff-container");

staff.renderEmptyStaff(null);

let currentExercise = null;
let lastOptions = null;
let contextTimers = [];

function clearContextTimers() {
  contextTimers.forEach((id) => clearTimeout(id));
  contextTimers = [];
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

async function playCurrentExercise(opts) {
  if (!currentExercise) return;
  clearContextTimers();
  await Tone.start();

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

  contextTimers.push(timerId);
}

// Plays: 1) Tonic Triad (2 beats) -> 2) 1-Octave Scale Up -> 3) Exercise Interval (Low -> High)
async function playContextSequence() {
  if (!currentExercise) return;
  clearContextTimers();
  await Tone.start();

  const beat = controls ? controls.getStaggerSeconds() : 60 / 90;
  const { tonicChord, ascendingScale, sortedInterval } =
    generator.getContextSequence(currentExercise);

  // Part 1: Tonic chord for 2 beats
  const chordDuration = beat * 2;
  engine.playChord(tonicChord, {
    mode: "harmonic",
    duration: chordDuration,
  });

  // Part 2: 1-octave ascending scale after a short pause (2.4 beats)
  const scaleStartSec = beat * 2.4;
  const scaleStepSec = beat * 0.45;
  const scaleTimer = setTimeout(() => {
    engine.playChord(ascendingScale, {
      mode: "melodic",
      stagger: scaleStepSec,
      duration: scaleStepSec * 1.15,
    });
  }, scaleStartSec * 1000);
  contextTimers.push(scaleTimer);

  // Part 3: The two exercise notes played lower -> higher after the scale finishes
  const intervalStartSec = scaleStartSec + ascendingScale.length * scaleStepSec + beat * 0.6;
  const intervalTimer = setTimeout(() => {
    engine.playChord(sortedInterval, {
      mode: "melodic",
      stagger: beat,
      duration: Math.max(1.2, beat * 1.3),
    });
  }, intervalStartSec * 1000);
  contextTimers.push(intervalTimer);
}

contextBtn.addEventListener("click", playContextSequence);

// 2. Initialize Controls Panel
const controls = new ControlsPanel(
  document.getElementById("controls-container"),
  engine.synth,
  {
    onKeyChange: (keyTonic, scaleType) => {
      const vexSig = generator.getVexKeySignature(keyTonic, scaleType);
      staff.setKeySignature(vexSig);
    },
    onNewExercise: (opts) => {
      lastOptions = opts;
      contextBtn.classList.add("hidden");
      currentExercise = generator.createExercise({
        allowedIntervals: opts.allowedIntervals,
        direction: opts.direction,
        rootNote: opts.rootNote,
        keyTonic: opts.keyTonic,
        scaleType: opts.scaleType,
      });
      staff.renderEmptyStaff(currentExercise.keySignature);
      feedbackText.textContent = "Listen and identify the interval below...";
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

// 3. Build Interval Answer Buttons
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
  feedbackText.textContent = `Answer: ${currentExercise.interval.name} (${currentExercise.notes.join(" → ")})`;
  staff.renderNotes(
    currentExercise.notes,
    currentExercise.playbackMode,
    currentExercise.keySignature
  );

  // Show the post-answer Context button
  contextBtn.classList.remove("hidden");

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
    feedbackText.textContent = `Not quite (${btn.textContent}). Try again or click Reveal on Staff.`;
  }
}

buildQuizButtons();
