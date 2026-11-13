// main.js
// Orchestrates Audio, Theory, Notation, and UI modules

import { SoundEngine } from "./audio/SoundEngine.js";
import { IntervalGenerator, INTERVALS } from "./theory/IntervalGenerator.js";
import { StaffRenderer } from "./notation/StaffRenderer.js";
import { ControlsPanel } from "./ui/ControlsPanel.js";

const statusBadge = document.getElementById("status-badge");
const feedbackText = document.getElementById("feedback-text");
const quizGrid = document.getElementById("quiz-grid");

// 1. Initialize Core Modules
const engine = new SoundEngine(() => {
  statusBadge.textContent = "Piano Samples Ready";
});
const generator = new IntervalGenerator();
const staff = new StaffRenderer("staff-container");

let currentExercise = null;
let lastOptions = null;

// Optional subtle metronome click using Web Audio oscillator
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

// Plays the current exercise (with optional 2-beat count-in click)
async function playCurrentExercise(opts) {
  if (!currentExercise) return;
  await Tone.start();

  const stagger = opts.stagger;
  const delayBeforeNotes = opts.metronomeClick ? stagger * 2 : 0;

  if (opts.metronomeClick) {
    const now = Tone.context.rawContext.currentTime;
    playMetronomeClick(now);
    playMetronomeClick(now + stagger);
  }

  setTimeout(() => {
    engine.playChord(currentExercise.notes, {
      mode: currentExercise.playbackMode,
      stagger,
      duration: Math.max(1.1, stagger * 1.2),
    });
  }, delayBeforeNotes * 1000);
}

// 2. Initialize Controls Panel
const controls = new ControlsPanel(
  document.getElementById("controls-container"),
  engine.synth,
  {
    onNewExercise: (opts) => {
      lastOptions = opts;
      currentExercise = generator.createExercise(opts.selectedInterval, opts.direction);
      staff.clear();
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
  staff.renderNotes(currentExercise.notes, currentExercise.playbackMode);

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
