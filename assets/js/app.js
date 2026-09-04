/**
 * Note Trainer: game loop and UI.
 *
 * Answer sources (all funnel into answer(midi)):
 *  - on-screen piano clicks
 *  - computer keyboard (A..K white keys, W/E/T/Y/U black keys, Z/X octave)
 *  - Web MIDI (USB or Bluetooth piano) via MidiInput
 */
(function () {
	'use strict';

	var T = window.Theory;
	var VF = window.Vex && window.Vex.Flow;

	var ROUND_LENGTH = 15;
	var PIANO_FROM = T.nameToMidi('C3');
	var PIANO_TO = T.nameToMidi('C6');

	var els = {
		screens: {
			levels: document.getElementById('screen-levels'),
			play: document.getElementById('screen-play'),
			done: document.getElementById('screen-done'),
		},
		levels: document.getElementById('levels'),
		staff: document.getElementById('staff'),
		feedback: document.getElementById('feedback'),
		replay: document.getElementById('btn-replay'),
		hudLevel: document.getElementById('hud-level'),
		hudProgress: document.getElementById('hud-progress'),
		hudStreak: document.getElementById('hud-streak'),
		pianoWrap: document.getElementById('piano-wrap'),
		piano: document.getElementById('piano'),
		midiConnect: document.getElementById('midi-connect'),
		midiPill: document.getElementById('midi-pill'),
	};

	var state = {
		level: null,
		question: null,
		index: 0,
		correct: 0,
		streak: 0,
		bestStreak: 0,
		locked: false,
		startedAt: 0,
		attempted: false,
	};

	/* ---------- screens ---------- */

	function show(name) {
		Object.keys(els.screens).forEach(function (k) {
			els.screens[k].hidden = k !== name;
		});
		els.pianoWrap.hidden = name !== 'play';
	}

	/* ---------- level select ---------- */

	function buildLevelSelect() {
		var groups = {};
		T.LEVELS.forEach(function (level) {
			(groups[level.group] = groups[level.group] || []).push(level);
		});
		Object.keys(groups).forEach(function (groupName) {
			var wrap = document.createElement('div');
			var heading = document.createElement('p');
			heading.className = 'levels__group-name';
			heading.textContent = groupName;
			var row = document.createElement('div');
			row.className = 'levels__row';
			groups[groupName].forEach(function (level) {
				var btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'level-btn';
				btn.textContent = level.name;
				btn.addEventListener('click', function () {
					startLevel(level.id);
				});
				row.appendChild(btn);
			});
			wrap.appendChild(heading);
			wrap.appendChild(row);
			els.levels.appendChild(wrap);
		});
	}

	/* ---------- staff rendering ---------- */

	function renderStaff(question, resultColor) {
		if (!VF) {
			return;
		}
		els.staff.innerHTML = '';
		var renderer = new VF.Renderer(els.staff, VF.Renderer.Backends.SVG);
		renderer.resize(320, 170);
		var ctx = renderer.getContext();
		var stave = new VF.Stave(10, 30, 290);
		stave.addClef(state.level.clef).setContext(ctx).draw();

		if (state.level.ear && !resultColor) {
			return; // ear training shows an empty stave until answered
		}

		var vex = T.toVexKey(question.name);
		var note = new VF.StaveNote({
			clef: state.level.clef,
			keys: [vex.key],
			duration: 'w',
		});
		if (vex.accidental) {
			var accidental = new VF.Accidental(vex.accidental);
			if (typeof note.addAccidental === 'function') {
				note.addAccidental(0, accidental); // classic VexFlow API
			} else {
				note.addModifier(accidental, 0); // VexFlow 4 API
			}
		}
		if (resultColor) {
			note.setStyle({ fillStyle: resultColor, strokeStyle: resultColor });
		}
		var voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
		voice.addTickables([note]);
		new VF.Formatter().joinVoices([voice]).format([voice], 220);
		voice.draw(ctx, stave);
	}

	/* ---------- piano widget ---------- */

	function buildPiano() {
		els.piano.innerHTML = '';
		var whites = [];
		var m;
		for (m = PIANO_FROM; m <= PIANO_TO; m++) {
			if (!T.isBlackKey(m)) {
				whites.push(m);
			}
		}
		var whiteWidth = 100 / whites.length;
		whites.forEach(function (midi) {
			var key = document.createElement('button');
			key.type = 'button';
			key.className = 'pk';
			key.dataset.midi = midi;
			key.setAttribute('aria-label', T.midiToName(midi));
			if (T.pitchClass(midi) === 0) {
				var label = document.createElement('span');
				label.className = 'pk__label';
				label.textContent = T.midiToName(midi);
				key.appendChild(label);
			}
			els.piano.appendChild(key);
		});
		for (m = PIANO_FROM; m <= PIANO_TO; m++) {
			if (!T.isBlackKey(m)) {
				continue;
			}
			var whiteIndex = 0;
			for (var w = 0; w < whites.length; w++) {
				if (whites[w] < m) {
					whiteIndex = w;
				}
			}
			var black = document.createElement('button');
			black.type = 'button';
			black.className = 'pk pk--black';
			black.dataset.midi = m;
			black.setAttribute('aria-label', T.midiToName(m));
			black.style.left = ((whiteIndex + 1) * whiteWidth - 1.02) + '%';
			els.piano.appendChild(black);
		}
		els.piano.addEventListener('pointerdown', function (e) {
			var key = e.target.closest('.pk');
			if (key) {
				answer(parseInt(key.dataset.midi, 10));
			}
		});
	}

	function keyEl(midi) {
		return els.piano.querySelector('.pk[data-midi="' + midi + '"]');
	}

	function flashKey(midi, cls, ms) {
		var el = keyEl(midi);
		if (!el) {
			return;
		}
		el.classList.add(cls);
		setTimeout(function () {
			el.classList.remove(cls);
		}, ms || 450);
	}

	/* ---------- computer keyboard ---------- */

	var KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
	var keyboardBase = T.nameToMidi('C4');

	document.addEventListener('keydown', function (e) {
		if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) {
			return;
		}
		var k = e.key.toLowerCase();
		if (k === 'z') {
			keyboardBase = Math.max(PIANO_FROM, keyboardBase - 12);
			return;
		}
		if (k === 'x') {
			keyboardBase = Math.min(PIANO_TO - 12, keyboardBase + 12);
			return;
		}
		if (KEYMAP.hasOwnProperty(k) && !els.screens.play.hidden) {
			answer(keyboardBase + KEYMAP[k]);
		}
	});

	/* ---------- MIDI ---------- */

	function refreshMidiPill(names) {
		if (names && names.length) {
			els.midiPill.textContent = names.join(', ');
			els.midiPill.hidden = false;
			els.midiConnect.hidden = true;
		} else {
			els.midiPill.hidden = true;
			els.midiConnect.hidden = false;
			els.midiConnect.textContent = 'Connect a piano';
		}
	}

	if (window.MidiInput && MidiInput.supported()) {
		els.midiConnect.hidden = false;
		els.midiConnect.addEventListener('click', function () {
			els.midiConnect.textContent = 'Connecting…';
			MidiInput.connect().then(refreshMidiPill, function () {
				els.midiConnect.textContent = 'MIDI unavailable';
			});
		});
		MidiInput.onDevicesChange(refreshMidiPill);
		MidiInput.onNote(function (e) {
			flashKey(e.midi, 'is-down', 180);
			if (!els.screens.play.hidden) {
				answer(e.midi);
			}
		});
	}

	/* ---------- game loop ---------- */

	function startLevel(id) {
		var level = null;
		T.LEVELS.forEach(function (l) {
			if (l.id === id) {
				level = l;
			}
		});
		if (!level) {
			return;
		}
		state.level = level;
		state.index = 0;
		state.correct = 0;
		state.streak = 0;
		state.bestStreak = 0;
		state.startedAt = Date.now();
		PianoAudio.preload(level.notes);
		els.hudLevel.textContent = level.group + ' · ' + level.name;
		els.replay.hidden = !level.ear;
		show('play');
		nextQuestion();
	}

	function nextQuestion() {
		state.question = T.makeQuestion(state.level, Math.random, state.question && state.question.midi);
		state.locked = false;
		state.attempted = false;
		els.feedback.textContent = state.level.ear ? 'Listen… then play what you hear' : 'Play this note';
		els.feedback.className = 'sheet__feedback';
		els.hudProgress.textContent = (state.index + 1) + ' / ' + ROUND_LENGTH;
		els.hudStreak.hidden = state.streak < 2;
		els.hudStreak.textContent = '★ ' + state.streak;
		renderStaff(state.question, null);
		if (state.level.ear) {
			setTimeout(function () {
				PianoAudio.play(state.question.midi);
			}, 350);
		}
	}

	function finishRound() {
		var seconds = Math.round((Date.now() - state.startedAt) / 1000);
		document.getElementById('res-score').textContent = state.correct;
		document.getElementById('res-total').textContent = ROUND_LENGTH;
		document.getElementById('res-streak').textContent = state.bestStreak;
		document.getElementById('res-time').textContent = seconds + 's';
		document.getElementById('done-title').textContent =
			state.correct === ROUND_LENGTH ? 'Perfect round!' :
			state.correct >= ROUND_LENGTH * 0.8 ? 'Nice work' : 'Keep practising';
		show('done');
	}

	function answer(midi) {
		if (state.locked || !state.question) {
			return;
		}
		flashKey(midi, 'is-down', 160);
		if (midi === state.question.midi) {
			state.locked = true;
			if (!state.attempted) {
				state.correct++;
				state.streak++;
				state.bestStreak = Math.max(state.bestStreak, state.streak);
			}
			els.feedback.textContent = 'Correct — ' + state.question.name;
			els.feedback.className = 'sheet__feedback is-good';
			renderStaff(state.question, '#2e7d4f');
			flashKey(midi, 'is-good', 650);
			if (!state.level.ear) {
				PianoAudio.play(midi);
			}
			state.index++;
			setTimeout(state.index >= ROUND_LENGTH ? finishRound : nextQuestion, 750);
		} else {
			state.attempted = true;
			state.streak = 0;
			els.feedback.textContent = 'Not ' + T.midiToName(midi) + ' — try again';
			els.feedback.className = 'sheet__feedback is-bad';
			flashKey(midi, 'is-bad', 500);
			PianoAudio.play(midi, 0.4);
			if (!state.level.ear) {
				renderStaff(state.question, '#b3342e');
				setTimeout(function () {
					if (!state.locked) {
						renderStaff(state.question, null);
					}
				}, 500);
			}
		}
	}

	/* ---------- wiring ---------- */

	els.replay.addEventListener('click', function () {
		if (state.question) {
			PianoAudio.play(state.question.midi);
		}
	});
	document.getElementById('btn-back').addEventListener('click', function () {
		show('levels');
	});
	document.getElementById('btn-again').addEventListener('click', function () {
		startLevel(state.level.id);
	});
	document.getElementById('btn-levels').addEventListener('click', function () {
		show('levels');
	});

	buildLevelSelect();
	buildPiano();
	show('levels');

	/* Debug and test hook (also used by the e2e test suite). */
	window.demo = {
		startLevel: startLevel,
		answer: answer,
		state: state,
	};
}());
