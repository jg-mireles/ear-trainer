// audio/PianoSampler.js
// Easy Mode: Wraps Tone.Sampler with real Salamander Grand Piano samples

export class PianoSampler {
  constructor(onLoadCallback) {
    this.isLoaded = false;

    this.sampler = new Tone.Sampler({
      urls: {
        A1: "A1.mp3",
        C3: "C3.mp3",
        "D#4": "Ds4.mp3",
        "F#5": "Fs5.mp3",
        A6: "A6.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        this.isLoaded = true;
        if (onLoadCallback) onLoadCallback();
      },
    }).toDestination();
  }

  playNote(note, duration = 1.0, startTime = Tone.now()) {
    if (!this.isLoaded) return;
    this.sampler.triggerAttackRelease(note, duration, startTime);
  }

  playChord(notes, { duration = 1.2, mode = "harmonic", stagger = 0.4 } = {}) {
    if (!this.isLoaded) return;
    const now = Tone.now();

    notes.forEach((note, index) => {
      const offset = mode === "melodic" ? index * stagger : 0;
      this.sampler.triggerAttackRelease(note, duration, now + offset);
    });
  }
}
