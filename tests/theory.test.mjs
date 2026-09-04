import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/theory.js';

const T = globalThis.Theory;

test('nameToMidi round trips', () => {
	assert.equal(T.nameToMidi('C4'), 60);
	assert.equal(T.nameToMidi('A4'), 69);
	assert.equal(T.nameToMidi('Db4'), 61);
	assert.equal(T.nameToMidi('C#4'), 61);
	assert.equal(T.nameToMidi('B3'), 59);
	assert.equal(T.nameToMidi('Cb4'), 59);
	assert.equal(T.nameToMidi('nope'), null);
});

test('midiToName spelling preferences', () => {
	assert.equal(T.midiToName(61, 'sharp'), 'C#4');
	assert.equal(T.midiToName(61, 'flat'), 'Db4');
	assert.equal(T.midiToName(60, 'flat'), 'C4');
});

test('sampleName matches the vendored soundfont file names (flats)', () => {
	assert.equal(T.sampleName(61), 'Db4');
	assert.equal(T.sampleName(70), 'Bb4');
	assert.equal(T.sampleName(48), 'C3');
});

test('toVexKey produces VexFlow keys with accidentals', () => {
	assert.deepEqual(T.toVexKey('C#4'), { key: 'c#/4', accidental: '#' });
	assert.deepEqual(T.toVexKey('Db4'), { key: 'db/4', accidental: 'b' });
	assert.deepEqual(T.toVexKey('G3'), { key: 'g/3', accidental: null });
});

test('naturalsBetween C4..C5 is one octave of naturals', () => {
	const notes = T.naturalsBetween('C4', 'C5');
	assert.deepEqual(notes, [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('accidentalsBetween C4..C5 is the five black keys', () => {
	assert.deepEqual(T.accidentalsBetween('C4', 'C5'), [61, 63, 66, 68, 70]);
});

test('every level has playable notes within the sampled range C2..C6', () => {
	for (const level of T.LEVELS) {
		assert.ok(level.notes.length >= 5, level.id + ' has enough notes');
		for (const m of level.notes) {
			assert.ok(m >= 36 && m <= 84, level.id + ' note ' + m + ' in sample range');
		}
	}
});

test('makeQuestion avoids immediate repeats and spells consistently', () => {
	const level = T.LEVELS.find((l) => l.id === 'treble-accidentals');
	let prev;
	let rngSeq = [0.1, 0.9, 0.3, 0.2, 0.7, 0.6, 0.5, 0.4, 0.8, 0.05];
	let i = 0;
	const rng = () => rngSeq[i++ % rngSeq.length];
	for (let n = 0; n < 10; n++) {
		const q = T.makeQuestion(level, rng, prev && prev.midi);
		assert.notEqual(q.midi, prev && prev.midi, 'no immediate repeat');
		assert.equal(T.nameToMidi(q.name), q.midi, 'spelling matches midi');
		prev = q;
	}
});

test('interval definitions use the expected semitone distances', () => {
	assert.equal(T.INTERVALS.m3.semitones, 3);
	assert.equal(T.INTERVALS.P5.semitones, 7);
	assert.equal(T.INTERVALS.M7.semitones, 11);
});

test('interval questions include the instruction fields and a matching sharp spelling', () => {
	const level = T.LEVELS.find((l) => l.id === 'intervals-1');
	const q = T.makeQuestion(level, () => 0);

	assert.equal(q.rootMidi, 60);
	assert.equal(q.rootName, 'C4');
	assert.equal(q.intervalName, 'minor 2nd');
	assert.equal(q.midi, 61);
	assert.equal(q.name, 'C#4');
	assert.equal(T.nameToMidi(q.name), q.midi);
});

test('interval levels include every possible target in their playable note range', () => {
	const levels = T.LEVELS.filter((level) => level.intervals);

	assert.deepEqual(levels.map((level) => level.id), ['intervals-1', 'intervals-2']);
	for (const level of levels) {
		const lo = Math.min(...level.notes);
		const hi = Math.max(...level.notes);
		for (const rootMidi of level.roots) {
			for (const intervalId of level.intervals) {
				const target = rootMidi + T.INTERVALS[intervalId].semitones;
				assert.ok(target >= lo && target <= hi, level.id + ' target ' + target + ' is in range');
				assert.ok(level.notes.includes(target), level.id + ' target ' + target + ' is playable');
			}
		}
	}
});
