// notation/StaffRenderer.js
// Renders intervals and chords onto an SVG musical staff using VexFlow

export class StaffRenderer {
  constructor(containerId, { width = 340, height = 160, clef = "treble" } = {}) {
    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.clef = clef;
  }

  clear() {
    const el = document.getElementById(this.containerId);
    if (el) el.innerHTML = "";
  }

  _toVexKey(noteName) {
    const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!match) return "c/4";
    return `${match[1].toLowerCase()}/${match[2]}`;
  }

  _getAccidental(noteName) {
    const match = noteName.match(/^[A-Ga-g]([#b])\d+$/);
    return match ? match[1] : null;
  }

  /**
   * Draws notes either stacked (harmonic) or side-by-side (melodic)
   */
  renderNotes(notes, mode = "harmonic") {
    this.clear();

    const { Renderer, Stave, StaveNote, Accidental, Voice, Formatter } = Vex.Flow;

    const container = document.getElementById(this.containerId);
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(this.width, this.height);

    const context = renderer.getContext();
    const stave = new Stave(10, 20, this.width - 20);
    stave.addClef(this.clef).setContext(context).draw();

    let staveNotes = [];

    if (mode === "harmonic") {
      // Sort low-to-high so VexFlow stacks chord heads cleanly
      const sorted = [...notes].sort(
        (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
      );

      const chordNote = new StaveNote({
        keys: sorted.map((n) => this._toVexKey(n)),
        duration: "w",
        clef: this.clef,
      });

      sorted.forEach((n, index) => {
        const acc = this._getAccidental(n);
        if (acc) chordNote.addModifier(new Accidental(acc), index);
      });

      staveNotes = [chordNote];
    } else {
      staveNotes = notes.map((n) => {
        const singleNote = new StaveNote({
          keys: [this._toVexKey(n)],
          duration: "h",
          clef: this.clef,
        });

        const acc = this._getAccidental(n);
        if (acc) singleNote.addModifier(new Accidental(acc), 0);
        return singleNote;
      });
    }

    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables(staveNotes);

    new Formatter().joinVoices([voice]).format([voice], this.width - 80);
    voice.draw(context, stave);
  }
}
