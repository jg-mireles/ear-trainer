// main.js
// Orchestrates Audio, Theory, Notation, and UI modules

import { SoundEngine } from "./audio/SoundEngine.js?v=22";
import { IntervalGenerator, INTERVALS } from "./theory/IntervalGenerator.js?v=22";
import { StaffRenderer } from "./notation/StaffRenderer.js?v=22";
import { ControlsPanel } from "./ui/ControlsPanel.js?v=22";

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

// Draw initial Piano Grand Staff with C Major right away
staff.renderEmptyStaff(generator.getVexKeySignature("C", "major"));

let currentExercise = null;
let lastOptions = null;

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
  await Tone.start();
  if (engine.synth?.ctx?.state === "suspended") {
    await engine.synth.ctx.resume();
  }
  engine.setMode(opts.soundMode);

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

// Plays: 1) Tonic Triad -> 2) 1-Octave Ascending Scale -> 3) Exercise Interval (Low -> High)
async function playContextSequence() {
  if (!currentExercise) return;
  await Tone.start();
  if (engine.synth?.ctx?.state === "suspended") {
    await engine.synth.ctx.resume();
  }
  engine.setMode(controls.state.soundMode);

  const stagger = controls.getStaggerSeconds();
  const seq = generator.getContextSequence(currentExercise);

  const chordDuration = stagger * 2;
  const scaleStepSec = Math.max(0.22, stagger * 0.5);
  const scaleTotalSec = seq.ascendingScale.length * scaleStepSec;
  const pauseAfterChord = 0.25;
  const pauseAfterScale = 0.35;

  // 1. Tonic Triad (2 beats)
  engine.playChord(seq.triad, {
    mode: "harmonic",
    duration: chordDuration,
  });

  // 2. 1-Octave Ascending Scale
  setTimeout(() => {
    engine.playChord(seq.ascendingScale, {
      mode: "melodic",
      stagger: scaleStepSec,
      duration: scaleStepSec * 0.9,
      allowShort: true,
    });
  }, (chordDuration + pauseAfterChord) * 1000);

  // 3. Target Interval (Lower -> Higher)
  setTimeout(() => {
    engine.playChord(seq.intervalAscending, {
      mode: "melodic",
      stagger,
      duration: Math.max(1.1, stagger * 1.2),
    });
  }, (chordDuration + pauseAfterChord + scaleTotalSec + pauseAfterScale) * 1000);
}

// 2. Initialize Controls Panel
const controls = new ControlsPanel(
  document.getElementById("controls-container"),
  engine.synth,
  {
    onKeyChange: (keyTonic, scaleType) => {
      if (keyTonic === "random") {
        staff.setKeySignature(null);
        feedbackText.textContent = "Random Key active — click 'New Interval' to draw a key.";
      } else {
        const vexSig = generator.getVexKeySignature(keyTonic, scaleType);
        staff.setKeySignature(vexSig);
        const label = generator.getKeyDisplayName(keyTonic, scaleType);
        feedbackText.textContent = `Selected Key: ${label} — click 'New Interval' to start.`;
      }
    },
    onNewExercise: (opts) => {
      lastOptions = opts;
      currentExercise = generator.createExercise({
        allowedIntervals: opts.allowedIntervals,
        direction: opts.direction,
        rootNote: opts.rootNote,
        keyTonic: opts.keyTonic,
        scaleType: opts.scaleType,
      });

      // Immediately draw the active key signature (sharps/flats) on the Piano Grand Staff
      staff.renderEmptyStaff(currentExercise.keySignature);
      contextBtn.classList.add("hidden");

      const keyPrefix = currentExercise.activeKeyTonic
        ? `Key: ${currentExercise.activeKeyLabel} (Tonic = ${currentExercise.activeKeyTonic}) — `
        : "Chromatic Mode — ";
      feedbackText.textContent = `${keyPrefix}Listen and identify the interval below...`;

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
  const keyTag = currentExercise.activeKeyTonic
    ? ` [${currentExercise.activeKeyLabel}]`
    : "";
  feedbackText.textContent = `Answer: ${currentExercise.interval.name} (${currentExercise.notes.join(" → ")})${keyTag}`;

  staff.renderNotes(
    currentExercise.notes,
    currentExercise.playbackMode,
    currentExercise.keySignature
  );

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
    const keyHint = currentExercise.activeKeyTonic
      ? ` (Active Key: ${currentExercise.activeKeyLabel})`
      : "";
    feedbackText.textContent = `Not quite (${btn.textContent})${keyHint}. Try again or click Reveal on Staff.`;
  }
}

contextBtn.addEventListener("click", playContextSequence);

buildQuizButtons();
