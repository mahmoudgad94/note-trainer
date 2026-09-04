# Testing MIDI without a physical piano

`virtual_piano.py` creates a MIDI output named `Demo Piano` so Note Trainer
can receive notes without a physical instrument.

From the repository root, create a virtual environment, install the two
Python dependencies, and start the interactive piano:

```sh
python3 -m venv .venv
.venv/bin/pip install mido python-rtmidi
.venv/bin/python tools/virtual_piano.py
```

Open Note Trainer and select **Connect a piano**. The page listens for MIDI
hot-plug events and will detect `Demo Piano` automatically, even if the script
starts after the page connects. Notes typed in the terminal are sent to the
page and answer the current exercise. Each line can contain a MIDI number, a
note name, or multiple space-separated notes:

```text
60
C4
F#3 Bb2
```

Type `quit` or press Ctrl-D to exit. The other modes play once and then keep
the port open for a two-second grace period:

```sh
.venv/bin/python tools/virtual_piano.py --play 'C4 E4 G4'
.venv/bin/python tools/virtual_piano.py --scale C4
```

## Platform notes

- macOS works out of the box through CoreMIDI.
- Linux needs ALSA virtual MIDI ports available on the system.
- Windows needs [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
  because RtMidi cannot create virtual ports there. Create a loopMIDI port
  named `Demo Piano` before starting the script.

## Zero-install alternative

For a quick JavaScript test, open the browser developer console on Note
Trainer and call the page's built-in test hook:

```js
window.MidiInput._simulate(60)
```

This feeds MIDI note 60 (C4) directly into the app without Python, a virtual
port, or additional software.
