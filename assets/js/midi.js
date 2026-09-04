/**
 * Web MIDI input: USB or Bluetooth pianos.
 *
 * A Bluetooth LE MIDI piano paired with the operating system appears here as a
 * normal MIDI input; no extra code path is needed. Not supported by iOS
 * browsers, so the app treats MIDI as an enhancement over the on-screen keys.
 */
(function (root) {
	'use strict';

	var access = null;
	var listeners = { note: [], devices: [] };

	function supported() {
		return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
	}

	function deviceNames() {
		if (!access) {
			return [];
		}
		var names = [];
		access.inputs.forEach(function (input) {
			if (input.state === 'connected') {
				names.push(input.name || 'MIDI device');
			}
		});
		return names;
	}

	function emit(type, payload) {
		listeners[type].forEach(function (fn) {
			fn(payload);
		});
	}

	function handleMessage(e) {
		var status = e.data[0] & 0xf0;
		var note = e.data[1];
		var velocity = e.data[2];
		if (status === 0x90 && velocity > 0) {
			emit('note', { midi: note, velocity: velocity });
		}
	}

	function attachAll() {
		access.inputs.forEach(function (input) {
			input.onmidimessage = handleMessage;
		});
		emit('devices', deviceNames());
	}

	/** Ask the browser for MIDI access (triggers the permission prompt). */
	function connect() {
		if (!supported()) {
			return Promise.reject(new Error('unsupported'));
		}
		return navigator.requestMIDIAccess({ sysex: false }).then(function (a) {
			access = a;
			attachAll();
			access.onstatechange = attachAll;
			return deviceNames();
		});
	}

	function onNote(fn) {
		listeners.note.push(fn);
	}

	function onDevicesChange(fn) {
		listeners.devices.push(fn);
	}

	root.MidiInput = {
		supported: supported,
		connect: connect,
		onNote: onNote,
		onDevicesChange: onDevicesChange,
		deviceNames: deviceNames,
		/* test hook: feed a note as if it came from a device */
		_simulate: function (midi) {
			emit('note', { midi: midi, velocity: 100 });
		},
	};
}(window));
