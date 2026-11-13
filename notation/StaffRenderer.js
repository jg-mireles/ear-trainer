// notation/StaffRenderer.js
// Renders an empty stave with key signature, and reveals notes with smart key-aware accidentals

export class StaffRenderer {
  constructor(containerId, { width = 360, height = 165, clef = "treble" } = {}) {
    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.clef = clef;
    this.currentKeySignature = null;
  }

  setKeySignature(keySignature) {
    this.currentKeySignature = keySignature || null;
    this.renderEmptyStaff(this.currentKeySignature);
  }

  _createStaveAndContext() {
    const container = document.getElementById(this.containerId);
    if (!container) return null;
    container.innerHTML = "";

    const { Renderer, Stave } = Vex.Flow;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(this.width, this.height);

    const context = renderer.getContext();
    const stave = new Stave(10, 22, this.width - 20);
    stave.addClef(this.clef);

    if (this.currentKeySignature) {
      stave.addKeySignature(this.currentKeySignature);
    }

    stave.setContext(context).draw();
    return { context, stave };
  }

  /**
   * Draws just the clef and key signature (used when starting/hiding an exercise)
   */
  renderEmptyStaff(keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;
    this._createStaveAndContext();
  }

  _toVexKey(noteName) {
    const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!match) return "c/4";
    return `${match[1].toLowerCase()}/${match[2]}`;
  }

  /**
   * Draws notes either stacked (harmonic) or side-by-side (melodic), applying key-aware accidentals
   */
  renderNotes(notes, mode = "harmonic", keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;
    const setup = this._createStaveAndContext();
    if (!setup) return;

    const { context, stave } = setup;
    const { StaveNote, Accidental, Voice, Formatter } = Vex.Flow;

    let staveNotes = [];

    if (mode === "harmonic") {
      const sorted = [...notes].sort(
        (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
      );

      const chordNote = new StaveNote({
        keys: sorted.map((n) => this._toVexKey(n)),
        duration: "w",
        clef: this.clef,
      });
      staveNotes = [chordNote];
    } else {
      staveNotes = notes.map(
        (n) =>
          new StaveNote({
            keys: [this._toVexKey(n)],
            duration: "h",
            clef: this.clef,
          })
      );
    }

    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables(staveNotes);

    // Automatically adds/suppresses accidentals based on the active key signature
    Accidental.applyAccidentals([voice], this.currentKeySignature || "C");

    new Formatter().joinVoices([voice]).format([voice], this.width - 110);
    voice.draw(context, stave);
  }
}
