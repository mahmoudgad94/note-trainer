# Note Trainer

A small, working music-exercise demo: read a note on the staff, then play it on the on-screen piano, your computer keyboard, or a **real piano connected over USB or Bluetooth MIDI** (Web MIDI API).

**Try it:** https://mahmoudgad94.github.io/note-trainer/

- Levels for treble and bass clef (naturals, accidentals, ledger lines), intervals, and basic ear training.
- Staff rendered with VexFlow; audio through Howler.js with real piano samples.
- Plain dependency-free JavaScript (no build step), the theory layer is unit-tested (`node --test tests/`).
- A worked example of how I approach maintenance tasks: [task walkthrough](https://mahmoudgad94.github.io/note-trainer/task.html).
- Outside-in observations from Musicca's public exercise pages: [engineering notes](https://mahmoudgad94.github.io/note-trainer/observations.html).

## Testing without a piano

Use the [virtual MIDI testing guide](tools/README.md) to answer exercises from
the terminal without a physical piano.

Built by [Mahmoud Ebaa](https://mahmoudebaa.com).

Piano samples from [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (MIT).
