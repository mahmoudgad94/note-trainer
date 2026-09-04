#!/usr/bin/env python3
"""Send test notes to Note Trainer through a virtual MIDI port."""

import argparse
import re
import sys
import time


PORT_NAME = "Demo Piano"
NOTE_DURATION = 0.15
NOTE_SPACING = 0.3
VELOCITY = 96

NOTE_OFFSETS = {
    "C": 0,
    "D": 2,
    "E": 4,
    "F": 5,
    "G": 7,
    "A": 9,
    "B": 11,
}
MAJOR_SCALE_INTERVALS = (0, 2, 4, 5, 7, 9, 11, 12)
NOTE_NAME_PATTERN = re.compile(r"^([A-Ga-g])([#b]?)(-?\d+)$")


def validate_midi_note(note):
    """Return a MIDI note number after checking the valid MIDI range."""
    if not 0 <= note <= 127:
        raise ValueError(f"MIDI note must be between 0 and 127: {note}")
    return note


def parse_note(value):
    """Convert a MIDI number or scientific-pitch note name to MIDI."""
    value = value.strip()

    if re.fullmatch(r"[+-]?\d+", value):
        return validate_midi_note(int(value))

    match = NOTE_NAME_PATTERN.fullmatch(value)
    if not match:
        raise ValueError(
            f"Invalid note {value!r}; use a MIDI number or a name like C4"
        )

    letter, accidental, octave_text = match.groups()
    accidental_offset = {"": 0, "#": 1, "b": -1}[accidental]
    note = (
        (int(octave_text) + 1) * 12
        + NOTE_OFFSETS[letter.upper()]
        + accidental_offset
    )
    return validate_midi_note(note)


def parse_notes(value):
    """Parse a whitespace-separated collection of notes."""
    tokens = value.split()
    if not tokens:
        raise ValueError("Enter at least one note")
    return [parse_note(token) for token in tokens]


def major_scale(root):
    """Build a one-octave major scale from a MIDI root note."""
    return [
        validate_midi_note(root + interval)
        for interval in MAJOR_SCALE_INTERVALS
    ]


def send_note(output, mido, note):
    """Send a short MIDI note, ensuring note_off follows interruption."""
    output.send(mido.Message("note_on", note=note, velocity=VELOCITY))
    try:
        time.sleep(NOTE_DURATION)
    finally:
        output.send(mido.Message("note_off", note=note, velocity=0))


def play_notes(output, mido, notes, spacing=0):
    """Play notes sequentially, optionally spacing their start times."""
    for index, note in enumerate(notes):
        send_note(output, mido, note)
        if spacing and index < len(notes) - 1:
            time.sleep(max(0, spacing - NOTE_DURATION))


def interactive(output, mido):
    """Read and play notes until the user quits or closes stdin."""
    print("Demo Piano is ready. Enter notes, or type 'quit' to exit.")
    while True:
        try:
            line = input("> ")
        except EOFError:
            print()
            return

        if line.strip().lower() == "quit":
            return
        if not line.strip():
            continue

        try:
            play_notes(output, mido, parse_notes(line))
        except ValueError as error:
            print(f"Error: {error}", file=sys.stderr)


def create_parser():
    """Create the command-line argument parser."""
    parser = argparse.ArgumentParser(
        description="Play test notes through a virtual MIDI port."
    )
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument(
        "--play",
        metavar="NOTES",
        help="play quoted, space-separated notes once",
    )
    modes.add_argument(
        "--scale",
        metavar="ROOT",
        help="play a major scale from the given root note",
    )
    return parser


def open_output(mido):
    """Open the virtual port, or a loopMIDI port on Windows."""
    if sys.platform == "win32":
        return mido.open_output(PORT_NAME)
    return mido.open_output(PORT_NAME, virtual=True)


def main(argv=None):
    """Run the virtual piano command-line interface."""
    args = create_parser().parse_args(argv)

    try:
        if args.play is not None:
            notes = parse_notes(args.play)
        elif args.scale is not None:
            notes = major_scale(parse_note(args.scale))
        else:
            notes = None
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    try:
        import mido
    except ImportError:
        print(
            "mido is not installed; see tools/README.md for setup.",
            file=sys.stderr,
        )
        return 1

    mido.set_backend("mido.backends.rtmidi")

    try:
        with open_output(mido) as output:
            if args.play is not None:
                play_notes(output, mido, notes, spacing=NOTE_SPACING)
                time.sleep(2)
            elif args.scale is not None:
                play_notes(output, mido, notes, spacing=NOTE_SPACING)
                time.sleep(2)
            else:
                interactive(output, mido)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 130
    except (OSError, RuntimeError) as error:
        print(f"Could not open {PORT_NAME!r}: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
