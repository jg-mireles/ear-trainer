// notation/StaffRenderer.js
// Renders a Piano Grand Staff (Treble + Bass) supporting single intervals, scales,
// and multi-measure 4-part SATB chord progressions with chord symbols and active-bar highlighting

export class StaffRenderer {
  constructor(containerId, { width = 520, height = 265 } = {}) {
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

  _createGrandStave(context, width = this.width) {
    const { Stave, StaveConnector } = Vex.Flow;

    const trebleStave = new Stave(24, 28, width - 38);
    trebleStave.addClef("treble");
    if (this.currentKeySignature) {
      trebleStave.addKeySignature(this.currentKeySignature);
    }
    trebleStave.setContext(context).draw();

    const bassStave = new Stave(24, 130, width - 38);
    bassStave.addClef("bass");
    if (this.currentKeySignature) {
      bassStave.addKeySignature(this.currentKeySignature);
    }
    bassStave.setContext(context).draw();

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

  renderEmptyStaff(keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;

    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = "";

    const { Renderer } = Vex.Flow;
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(this.width, this.height);
    const context = renderer.getContext();

    this._createGrandStave(context, this.width);
  }

  /**
   * Renders a multi-measure 4-part SATB score across sequential bars on the Grand Staff.
   * Each step in `steps` has { symbol, roman, voices: [Bass, Tenor, Alto, Soprano] }.
   * `activeIndex` highlights the currently sounding measure in blue while keeping all bars visible.
   */
  renderProgressionSATB(steps, activeIndex = -1, keySignature = this.currentKeySignature) {
    this.currentKeySignature = keySignature || null;
    const container = document.getElementById(this.containerId);
    if (!container || !steps || steps.length === 0) return;
    container.innerHTML = "";

    const {
      Renderer,
      Stave,
      StaveConnector,
      StaveNote,
      Accidental,
      Voice,
      Formatter,
      Barline,
      Annotation,
    } = Vex.Flow;

    const numBars = steps.length;
    const firstBarWidth = 175;
    const otherBarWidth = 135;
    const totalWidth = Math.max(
      this.width,
      28 + firstBarWidth + Math.max(0, numBars - 1) * otherBarWidth + 20
    );

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(totalWidth, this.height);
    const context = renderer.getContext();

    const activeKey = this.currentKeySignature || "C";
    let xCursor = 24;

    steps.forEach((step, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === numBars - 1;
      const barWidth = isFirst ? firstBarWidth : otherBarWidth;

      const trebleStave = new Stave(xCursor, 32, barWidth);
      const bassStave = new Stave(xCursor, 134, barWidth);

      if (isFirst) {
        trebleStave.addClef("treble");
        bassStave.addClef("bass");
        if (this.currentKeySignature) {
          trebleStave.addKeySignature(this.currentKeySignature);
          bassStave.addKeySignature(this.currentKeySignature);
        }
      }

      if (isLast) {
        trebleStave.setEndBarType(Barline.type.END);
        bassStave.setEndBarType(Barline.type.END);
      }

      trebleStave.setContext(context).draw();
      bassStave.setContext(context).draw();

      if (isFirst) {
        const brace = new StaveConnector(trebleStave, bassStave);
        brace.setType(StaveConnector.type.BRACE);
        brace.setContext(context).draw();

        const leftLine = new StaveConnector(trebleStave, bassStave);
        leftLine.setType(StaveConnector.type.SINGLE_LEFT);
        leftLine.setContext(context).draw();
      }

      const rightLine = new StaveConnector(trebleStave, bassStave);
      rightLine.setType(
        isLast ? StaveConnector.type.BOLD_DOUBLE_RIGHT : StaveConnector.type.SINGLE_RIGHT
      );
      rightLine.setContext(context).draw();

      // SATB voices: [0]=Bass, [1]=Tenor, [2]=Alto, [3]=Soprano
      const [bassPitch, tenorPitch, altoPitch, sopranoPitch] = step.voices;

      const sopranoNote = new StaveNote({
        keys: [this._toVexKey(sopranoPitch)],
        duration: "w",
        clef: "treble",
        stem_direction: 1,
      });
      const altoNote = new StaveNote({
        keys: [this._toVexKey(altoPitch)],
        duration: "w",
        clef: "treble",
        stem_direction: -1,
      });

      // Chord symbol + Roman numeral annotation above Soprano
      const labelText = `${step.symbol} (${step.roman})`;
      const chordLabel = new Annotation(labelText)
        .setFont("Arial", 11, step.isTarget ? "bold" : "normal")
        .setVerticalJustification(Annotation.VerticalJustify.TOP);
      sopranoNote.addModifier(chordLabel, 0);

      const tenorNote = new StaveNote({
        keys: [this._toVexKey(tenorPitch)],
        duration: "w",
        clef: "bass",
        stem_direction: 1,
      });
      const bassNote = new StaveNote({
        keys: [this._toVexKey(bassPitch)],
        duration: "w",
        clef: "bass",
        stem_direction: -1,
      });

      // Highlight currently sounding measure
      if (idx === activeIndex) {
        const highlight = { fillStyle: "#2563eb", strokeStyle: "#2563eb" };
        sopranoNote.setStyle(highlight);
        altoNote.setStyle(highlight);
        tenorNote.setStyle(highlight);
        bassNote.setStyle(highlight);
      }

      const vSoprano = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([sopranoNote]);
      const vAlto = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([altoNote]);
      const vTenor = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([tenorNote]);
      const vBass = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([bassNote]);

      Accidental.applyAccidentals([vSoprano, vAlto], activeKey);
      Accidental.applyAccidentals([vTenor, vBass], activeKey);

      const formatWidth = isFirst ? barWidth - 85 : barWidth - 35;
      new Formatter()
        .joinVoices([vSoprano, vAlto])
        .joinVoices([vTenor, vBass])
        .format([vSoprano, vAlto, vTenor, vBass], formatWidth);

      vSoprano.draw(context, trebleStave);
      vAlto.draw(context, trebleStave);
      vTenor.draw(context, bassStave);
      vBass.draw(context, bassStave);

      xCursor += barWidth;
    });
  }

  /**
   * Draws single intervals, triads, or ascending scales on the Grand Staff
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

    const { trebleStave, bassStave } = this._createGrandStave(context, this.width);
    const middleCMidi = 60; // C4

    const trebleNotes = [];
    const bassNotes = [];
    let numBeats = 4;

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
      const noteDuration = notes.length > 2 ? "q" : "h";
      numBeats = notes.length > 2 ? notes.length : 4;

      notes.forEach((n) => {
        const isTreble = Tonal.Note.midi(n) >= middleCMidi;
        if (isTreble) {
          trebleNotes.push(
            new StaveNote({
              keys: [this._toVexKey(n)],
              duration: noteDuration,
              clef: "treble",
            })
          );
          bassNotes.push(new GhostNote({ duration: noteDuration }));
        } else {
          trebleNotes.push(new GhostNote({ duration: noteDuration }));
          bassNotes.push(
            new StaveNote({
              keys: [this._toVexKey(n)],
              duration: noteDuration,
              clef: "bass",
            })
          );
        }
      });
    }

    const trebleVoice = new Voice({ num_beats: numBeats, beat_value: 4 });
    trebleVoice.addTickables(trebleNotes);

    const bassVoice = new Voice({ num_beats: numBeats, beat_value: 4 });
    bassVoice.addTickables(bassNotes);

    const activeKey = this.currentKeySignature || "C";
    Accidental.applyAccidentals([trebleVoice], activeKey);
    Accidental.applyAccidentals([bassVoice], activeKey);

    new Formatter()
      .joinVoices([trebleVoice])
      .joinVoices([bassVoice])
      .format([trebleVoice, bassVoice], this.width - 140);

    trebleVoice.draw(context, trebleStave);
    bassVoice.draw(context, bassStave);
  }
}
