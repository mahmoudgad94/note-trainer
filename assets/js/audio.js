/**
 * Piano sound via Howler.js (the same audio library Musicca's exercises load).
 * One Howl per note, created lazily, C2..C6.
 */
(function (root) {
	'use strict';

	var cache = {};

	function play(midi, volume) {
		if (midi < 36 || midi > 84) {
			return;
		}
		var name = root.Theory.sampleName(midi);
		if (!cache[name]) {
			cache[name] = new Howl({
				src: ['assets/audio/' + name + '.mp3'],
				volume: typeof volume === 'number' ? volume : 0.9,
			});
		}
		cache[name].play();
	}

	/** Warm the cache for a level's notes so the first answer is not late. */
	function preload(midis) {
		midis.forEach(function (m) {
			var name = root.Theory.sampleName(m);
			if (!cache[name]) {
				cache[name] = new Howl({ src: ['assets/audio/' + name + '.mp3'], preload: true });
			}
		});
	}

	root.PianoAudio = { play: play, preload: preload };
}(window));
