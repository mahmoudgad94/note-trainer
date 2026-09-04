/**
 * Music theory helpers: MIDI numbers <-> spelled notes <-> staff positions.
 * Pure functions, no DOM. Shared by the app and the unit tests.
 */
(function (root) {
	'use strict';

	var SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	var FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	var LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
	/** Named intervals available to interval exercises. */
	var INTERVALS = {
		m2: { semitones: 1, name: 'minor 2nd' },
		M2: { semitones: 2, name: 'major 2nd' },
		m3: { semitones: 3, name: 'minor 3rd' },
		M3: { semitones: 4, name: 'major 3rd' },
		P4: { semitones: 5, name: 'perfect 4th' },
		P5: { semitones: 7, name: 'perfect 5th' },
		m6: { semitones: 8, name: 'minor 6th' },
		M6: { semitones: 9, name: 'major 6th' },
		m7: { semitones: 10, name: 'minor 7th' },
		M7: { semitones: 11, name: 'major 7th' },
		P8: { semitones: 12, name: 'perfect octave' },
	};

	function octaveOf(midi) {
		return Math.floor(midi / 12) - 1;
	}

	function pitchClass(midi) {
		return ((midi % 12) + 12) % 12;
	}

	/** "Db4" -> 61. Accepts #, b. Returns null when unparseable. */
	function nameToMidi(name) {
		var m = /^([A-G])(#|b)?(-?\d+)$/.exec(String(name).trim());
		if (!m) {
			return null;
		}
		var semi = LETTER_SEMITONE[m[1]];
		if (m[2] === '#') {
			semi += 1;
		}
		if (m[2] === 'b') {
			semi -= 1;
		}
		return (parseInt(m[3], 10) + 1) * 12 + semi;
	}

	/**
	 * Spell a MIDI note. prefer: 'sharp' | 'flat' | 'natural-only' (naturals unchanged,
	 * black keys spelled with the preference; default sharp).
	 */
	function midiToName(midi, prefer) {
		var names = prefer === 'flat' ? FLAT_NAMES : SHARP_NAMES;
		return names[pitchClass(midi)] + octaveOf(midi);
	}

	/** Audio sample file name: gleitz soundfont uses flat spellings (Db4.mp3). */
	function sampleName(midi) {
		return FLAT_NAMES[pitchClass(midi)] + octaveOf(midi);
	}

	/** "Db4" -> { key: 'db/4', accidental: 'b' } for VexFlow. */
	function toVexKey(name) {
		var m = /^([A-G])(#|b)?(-?\d+)$/.exec(name);
		var acc = m[2] || null;
		return {
			key: (m[1] + (m[2] || '')).toLowerCase() + '/' + m[3],
			accidental: acc,
		};
	}

	function isBlackKey(midi) {
		return [1, 3, 6, 8, 10].indexOf(pitchClass(midi)) !== -1;
	}

	/** Inclusive range of natural MIDI notes between two note names. */
	function naturalsBetween(fromName, toName) {
		var out = [];
		for (var m = nameToMidi(fromName); m <= nameToMidi(toName); m++) {
			if (!isBlackKey(m)) {
				out.push(m);
			}
		}
		return out;
	}

	function accidentalsBetween(fromName, toName) {
		var out = [];
		for (var m = nameToMidi(fromName); m <= nameToMidi(toName); m++) {
			if (isBlackKey(m)) {
				out.push(m);
			}
		}
		return out;
	}

	/** Sorted unique targets produced by combining roots and intervals. */
	function intervalTargets(roots, intervalIds) {
		var out = [];
		roots.forEach(function (rootMidi) {
			intervalIds.forEach(function (intervalId) {
				var target = rootMidi + INTERVALS[intervalId].semitones;
				if (out.indexOf(target) === -1) {
					out.push(target);
				}
			});
		});
		return out.sort(function (a, b) { return a - b; });
	}

	var INTERVALS_1 = ['m2', 'M2', 'm3', 'M3', 'P4', 'P5'];
	var INTERVALS_2 = INTERVALS_1.concat(['m6', 'M6', 'm7', 'M7', 'P8']);
	var INTERVAL_ROOTS_1 = naturalsBetween('C4', 'C5');
	var INTERVAL_ROOTS_2 = naturalsBetween('A3', 'C5');

	/** Exercise levels. Each question picks a MIDI note and a spelling. */
	var LEVELS = [
		{
			id: 'treble-naturals-1',
			group: 'Treble clef',
			name: 'Naturals 1',
			clef: 'treble',
			notes: naturalsBetween('C4', 'C5'),
			spell: 'natural',
		},
		{
			id: 'treble-naturals-2',
			group: 'Treble clef',
			name: 'Naturals 2',
			clef: 'treble',
			notes: naturalsBetween('A3', 'A5'),
			spell: 'natural',
		},
		{
			id: 'treble-accidentals',
			group: 'Treble clef',
			name: 'Accidentals',
			clef: 'treble',
			notes: accidentalsBetween('C4', 'C5'),
			spell: 'mixed',
		},
		{
			id: 'treble-ledger',
			group: 'Treble clef',
			name: 'Ledger lines',
			clef: 'treble',
			notes: naturalsBetween('C3', 'B3').concat(naturalsBetween('B5', 'C6')),
			spell: 'natural',
		},
		{
			id: 'bass-naturals-1',
			group: 'Bass clef',
			name: 'Naturals 1',
			clef: 'bass',
			notes: naturalsBetween('C3', 'C4'),
			spell: 'natural',
		},
		{
			id: 'bass-naturals-2',
			group: 'Bass clef',
			name: 'Naturals 2',
			clef: 'bass',
			notes: naturalsBetween('C2', 'E4'),
			spell: 'natural',
		},
		{
			id: 'bass-accidentals',
			group: 'Bass clef',
			name: 'Accidentals',
			clef: 'bass',
			notes: accidentalsBetween('C3', 'C4'),
			spell: 'mixed',
		},
		{
			id: 'intervals-1',
			group: 'Intervals',
			name: 'Level 1',
			clef: 'treble',
			intervals: INTERVALS_1,
			roots: INTERVAL_ROOTS_1,
			notes: intervalTargets(INTERVAL_ROOTS_1, INTERVALS_1),
			spell: 'sharp',
		},
		{
			id: 'intervals-2',
			group: 'Intervals',
			name: 'Level 2',
			clef: 'treble',
			intervals: INTERVALS_2,
			roots: INTERVAL_ROOTS_2,
			notes: intervalTargets(INTERVAL_ROOTS_2, INTERVALS_2),
			spell: 'sharp',
		},
		{
			id: 'ear-1',
			group: 'Ear training',
			name: 'Pitch 1',
			clef: 'treble',
			ear: true,
			notes: naturalsBetween('C4', 'C5'),
			spell: 'natural',
		},
	];

	/** Deterministic-friendly question generator (rng injectable for tests). */
	function makeQuestion(level, rng, previousMidi) {
		rng = rng || Math.random;
		var midi = previousMidi;
		var rootMidi;
		var interval;
		if (level.intervals) {
			for (var intervalGuard = 0; intervalGuard < 20 && midi === previousMidi; intervalGuard++) {
				rootMidi = level.roots[Math.floor(rng() * level.roots.length)];
				interval = INTERVALS[level.intervals[Math.floor(rng() * level.intervals.length)]];
				midi = rootMidi + interval.semitones;
			}
			return {
				midi: midi,
				rootMidi: rootMidi,
				rootName: midiToName(rootMidi),
				intervalName: interval.name,
				name: midiToName(midi),
			};
		}
		for (var guard = 0; guard < 20 && midi === previousMidi; guard++) {
			midi = level.notes[Math.floor(rng() * level.notes.length)];
		}
		var prefer = 'sharp';
		if (level.spell === 'mixed') {
			prefer = rng() < 0.5 ? 'sharp' : 'flat';
		}
		return {
			midi: midi,
			name: midiToName(midi, prefer),
		};
	}

	root.Theory = {
		nameToMidi: nameToMidi,
		midiToName: midiToName,
		sampleName: sampleName,
		toVexKey: toVexKey,
		isBlackKey: isBlackKey,
		naturalsBetween: naturalsBetween,
		accidentalsBetween: accidentalsBetween,
		pitchClass: pitchClass,
		octaveOf: octaveOf,
		INTERVALS: INTERVALS,
		LEVELS: LEVELS,
		makeQuestion: makeQuestion,
	};
}(typeof window !== 'undefined' ? window : globalThis));
