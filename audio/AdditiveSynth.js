// audio/AdditiveSynth.js
// Hard Mode: Custom Web Audio additive synthesizer with harmonic, stretch, and decay controls

export class AdditiveSynth {
  constructor(audioContext) {
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    // Master output gain to prevent clipping when stacking chords & harmonics
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.ctx.destination);

    // Default Synth Parameters (modifiable in real time via UI sliders)
    this.params = {
      harmonics: [1.0, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01], // Partials 1..8
      inharmonicity: 0.0,   // B coefficient (0 = pure harmonic, >0 = stretched partials)
      highDecayRate: 0.5,   // 0 = uniform decay, 1 = upper partials fade rapidly
    };
  }

  // --- SECTION A: Parameter Updaters ---

  setHarmonic(index, amplitude) {
    if (index >= 0 && index < this.params.harmonics.length) {
      this.params.harmonics[index] = amplitude;
    }
  }

  setInharmonicity(value) {
    this.params.inharmonicity = value;
  }

  setHighDecayRate(value) {
    this.params.highDecayRate = value;
  }

  // --- SECTION B: Acoustic Physics Math ---

  _computePartialFreq(fundamental, partialNumber) {
    const B = this.params.inharmonicity;
    return partialNumber * fundamental * Math.sqrt(1 + B * Math.pow(partialNumber, 2));
  }

  _computePartialDuration(baseDuration, partialNumber) {
    const damping = 1 + this.params.highDecayRate * (partialNumber - 1) * 0.45;
    return Math.max(0.25, baseDuration / damping);
  }

  // --- SECTION C: Voice Synthesis & Playback ---

  playFreq(fundamental, duration = 2.2, startTime = this.ctx.currentTime) {
    if (this.ctx.state === "suspended") this.ctx.resume();

    // Ensure Hard Mode tones always have enough body to be heard clearly
    const effectiveDuration = Math.max(2.0, duration * 1.6);
    const activeSum = this.params.harmonics.reduce((sum, amp) => sum + amp, 0) || 1;

    this.params.harmonics.forEach((amplitude, idx) => {
      if (amplitude <= 0.001) return;

      const partialNum = idx + 1;
      const freq = this._computePartialFreq(fundamental, partialNum);
      const partialDuration = this._computePartialDuration(effectiveDuration, partialNum);

      if (freq > 20000) return;

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      const peakGain = amplitude / activeSum;
      const attackTime = 0.02;
      // Hold peak level briefly before decaying so tones don't feel clipped
      const holdTime = partialDuration * 0.35;

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
      env.gain.setValueAtTime(peakGain, startTime + attackTime + holdTime);
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + partialDuration);

      osc.connect(env);
      env.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + partialDuration + 0.03);
    });
  }

  playChord(frequencies, { duration = 2.2, mode = "harmonic", stagger = 0.4 } = {}) {
    const now = this.ctx.currentTime;
    frequencies.forEach((freq, index) => {
      const offset = mode === "melodic" ? index * stagger : 0;
      this.playFreq(freq, duration, now + offset);
    });
  }
}
