// notation/StaffRenderer.js
// Renders a Piano Grand Staff (Treble + Bass braced together) with key signatures and key-aware accidentals

export class StaffRenderer {
  constructor(containerId, { width = 380, height = 245 } = {}) {
    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.currentKeySignature = null;
  }

  setKeySignature(keySignature) {
    this.currentKeySignature = keySignature || null;
    this.renderEmptyStaff(this.currentKeySignature);
  }

  _toVexKey(noteName) {
    const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!match) return "c/4";
    return `${match[1].toLowerCase()}/${match[2]}`;
  }

  _createGrandStave(context) {
    const { Stave, StaveConnector } = Vex.Flow;

    const trebleStave = new Stave(24, 18, this.width - 38);
    trebleStave.addClef("treble");
    if (this.currentKeySignature) {
      trebleStave.addKeySignature(this.currentKeySignature);
    }
    trebleStave.setContext(context).draw();

    const bassStave = new Stave(24, 118, this.width - 38);
    bassStave.addClef("bass");
    if (this.currentKeySignature) {
      bassStave.addKeySignature(this.currentKeySignature);
    }
    bassStave.setContext(context).draw();

    // Brace and barlines connecting Treble + Bass into a Piano Grand Staff
    const brace = new StaveConnector(trebleStave, bassStave);
    brace.setType(StaveConnector.type.BRACE);
    brace.setContext(context).draw();

    const lineLeft = new StaveConnector(trebleStave, bassStave);
    lineLeft.setType(StaveConnector.type.SINGLE_LEFT);
    lineLeft.setContext(context).draw();

    const lineRight = new StaveConnector(trebleStave, bassStave);
    lineRight.setType(StaveConnector.type.SINGLE_RIGHT);
    lineRight.setContext(context).draw();

    return { trebleStave, bassStave };
  }

  /**
   * Draws just the Piano Grand Staff and active key signature (before answer reveal)
   */
  renderEmptyStaff(keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;

    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = "";

    const { Renderer } = Vex.Flow;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(this.width, this.height);
    const context = renderer.getContext();

    this._createGrandStave(context);
  }

  /**
   * Draws notes across the Piano Grand Staff (C4+ on Treble, below C4 on Bass)
   */
  renderNotes(notes, mode = "harmonic", keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;

    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = "";

    const { Renderer, StaveNote, GhostNote, Accidental, Voice, Formatter } = Vex.Flow;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(this.width, this.height);
    const context = renderer.getContext();

    const { trebleStave, bassStave } = this._createGrandStave(context);
    const middleCMidi = 60; // C4

    const trebleNotes = [];
    const bassNotes = [];

    if (mode === "harmonic") {
      const sorted = [...notes].sort(
        (a, b) => Tonal.Note.midi(a) - Tonal.Note.midi(b)
      );
      const treblePitches = sorted.filter((n) => Tonal.Note.midi(n) >= middleCMidi);
      const bassPitches = sorted.filter((n) => Tonal.Note.midi(n) < middleCMidi);

      trebleNotes.push(
        treblePitches.length > 0
          ? new StaveNote({
              keys: treblePitches.map((n) => this._toVexKey(n)),
              duration: "w",
              clef: "treble",
            })
          : new GhostNote({ duration: "w" })
      );

      bassNotes.push(
        bassPitches.length > 0
          ? new StaveNote({
              keys: bassPitches.map((n) => this._toVexKey(n)),
              duration: "w",
              clef: "bass",
            })
          : new GhostNote({ duration: "w" })
      );
    } else {
      notes.forEach((n) => {
        const isTreble = Tonal.Note.midi(n) >= middleCMidi;
        if (isTreble) {
          trebleNotes.push(
            new StaveNote({
              keys: [this._toVexKey(n)],
              duration: "h",
              clef: "treble",
            })
          );
          bassNotes.push(new GhostNote({ duration: "h" }));
        } else {
          trebleNotes.push(new GhostNote({ duration: "h" }));
          bassNotes.push(
            new StaveNote({
              keys: [this._toVexKey(n)],
              duration: "h",
              clef: "bass",
            })
          );
        }
      });
    }

    const trebleVoice = new Voice({ num_beats: 4, beat_value: 4 });
    trebleVoice.addTickables(trebleNotes);

    const bassVoice = new Voice({ num_beats: 4, beat_value: 4 });
    bassVoice.addTickables(bassNotes);

    const activeKey = this.currentKeySignature || "C";
    Accidental.applyAccidentals([trebleVoice], activeKey);
    Accidental.applyAccidentals([bassVoice], activeKey);

    new Formatter()
      .joinVoices([trebleVoice])
      .joinVoices([bassVoice])
      .format([trebleVoice, bassVoice], this.width - 130);

    trebleVoice.draw(context, trebleStave);
    bassVoice.draw(context, bassStave);
  }
}
