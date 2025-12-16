export class AudioController {
    constructor() {
        this.ctx = null;
        this.bpm = 140;
        this.currentSongId = 1;

        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.nextNoteTime = 0.0;
        this.current16thNote = 0;
        this.isPlaying = false;
        this.timerID = null;
        this.measure = 0;
        this.notesInQueue = [];
        this.totalMeasures = 64;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -10;
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
    }

    setSong(id) {
        this.currentSongId = id;
        if (id === 1) this.bpm = 140;
        else if (id === 2) this.bpm = 180;
        this.totalMeasures = (id === 1) ? 57 : 64; // TBD for Song 2
    }

    play() {
        try {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            if (this.isPlaying) return;

            this.isPlaying = true;
            this.current16thNote = 0;
            this.measure = 0;
            // Add a small delay to ensure smooth start
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
        } catch (e) {
            console.error("Audio Play Error:", e);
        }
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(this.scheduler.bind(this), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
            this.measure++;
        }
    }

    scheduleNote(beatNumber, time) {
        this.notesInQueue.push({ note: beatNumber, time: time });
        if (this.currentSongId === 1) this.scheduleSong1(beatNumber, time);
        else if (this.currentSongId === 2) this.scheduleSong2(beatNumber, time);
    }

    // ==========================================
    // SONG 1: First Steps (Ver 1.10 Preserved)
    // ==========================================
    scheduleSong1(beatNumber, time) {
        const m = this.measure;
        const step = beatNumber;
        if (m >= 56) return; // Cut

        const isIntro = m < 8;
        const isBuild = m >= 8 && m < 16;
        const isDrop = m >= 16 && m < 32;
        const isChill = m >= 32 && m < 40;
        const isClimax = m >= 40 && m < 56;

        // Harmony Setup
        const progressionStep = Math.floor(m / 2) % 4;
        const roots = { 'Am': 220, 'F': 174.61, 'C': 261.63, 'G': 196.00 };
        const chords = {
            'Am': [220, 329.63], 'F': [174.61, 261.63], 'C': [261.63, 392.00], 'G': [196.00, 293.66]
        };
        let currentChordKey = 'Am';
        if (progressionStep === 1) currentChordKey = 'F';
        if (progressionStep === 2) currentChordKey = 'C';
        if (progressionStep === 3) currentChordKey = 'G';
        const currentNotes = chords[currentChordKey];

        // Drums
        if (!isChill) {
            if (step % 4 === 0 && (isDrop || isClimax || (isBuild && m % 2 === 1) || (isIntro && m >= 4))) {
                this.playKick(time, isClimax ? 1.2 : 1.0);
            }
            if (step % 8 === 4 && (isDrop || isClimax || (isIntro && m >= 4))) {
                this.playSnare(time);
            }
        }
        if (isBuild) {
            if (m >= 12 && step % 2 === 0) this.playHiHat(time, 0.5);
            if (m === 15) this.playHiHat(time, 0.8, true);
        }
        if ((isDrop || isClimax) && step % 2 === 0) {
            this.playHiHat(time, step % 4 === 2 ? 0.6 : 0.3);
        }

        // Synths
        if (isDrop || isClimax) {
            // 1. Original Layer
            const synthTrigs = [0, 3, 6, 8, 11, 14];
            if (synthTrigs.includes(step)) {
                const noteIdx = (step % 3);
                const baseFreq = roots[currentChordKey];
                const freqs = [baseFreq * 2, baseFreq * 3, baseFreq * 4];
                this.playSynth(time, freqs[noteIdx % freqs.length], 0.2);
            }
            // 2. Heavy Layer
            if (step % 4 === 0) {
                const baseFreq = roots[currentChordKey];
                this.playHeavySynth(time, baseFreq / 2, 0.3);
            }
        }

        // Bass
        if ((isDrop || isClimax) && !isChill) {
            if (step % 4 === 2) this.playBass(time, roots[currentChordKey] / 2, 0.2);
        }
        if (isIntro && m >= 4 && step === 0) this.playBass(time, roots[currentChordKey] / 4, 0.6);

        // Pads
        if (isIntro || isChill) {
            if (step === 0 && m % 2 === 0) this.playChord(time, currentNotes, 'sine', 2.0, 0.15);
            if (step === 0 && m % 2 === 1) this.playChord(time, currentNotes, 'sine', 2.0, 0.1);
            if (step % 2 === 0) this.playSine(time, roots[currentChordKey] * (step % 4 === 0 ? 2 : 4), 0.05);
        }
        if (isBuild) {
            if (step % 4 === 0) this.playChord(time, currentNotes, 'sawtooth', 0.2, 0.1);
        }
    }

    // ==========================================
    // SONG 2: Velocity (Ver 2.0 New)
    // ==========================================
    scheduleSong2(beatNumber, time) {
        const m = this.measure;
        const step = beatNumber;

        // Structure:
        // 0-8: Intro (Fast Arp)
        // 8-16: Build (Drums enter)
        // 16-32: Drop (Drum & Bass Full)
        // 32-40: Break (Atmospheric)
        // 40-56: Final Rush

        if (m >= 56) return;

        // -- FAST DRUMS (DnB Style) --
        // Kick: 0, 10 (dotted rhythm ish)
        // Snare: 4, 12

        const isDrop = (m >= 16 && m < 32) || (m >= 40 && m < 56);
        const isBuild = (m >= 8 && m < 16);

        if (isDrop || isBuild) {
            // Kick
            if (step === 0 || step === 10) this.playKick(time, 1.0);
            // Snare
            if (step === 4 || step === 12) this.playSnare(time);
            // Hats
            if (step % 2 === 0) this.playHiHat(time, 0.2);
            if (step % 4 === 2) this.playHiHat(time, 0.3, true);
        }

        // -- BASS --
        // Reese Bass (Long, detuned) on 0
        if (isDrop && step === 0) {
            const freq = (m % 4 === 0 || m % 4 === 1) ? 55 : (m % 4 === 2 ? 65 : 49);
            this.playHeavySynth(time, freq, 0.5);
        }

        // -- ARP --
        // 16th note continuous arp
        if (m < 56) {
            const base = 440;
            const arpSequence = [0, 3, 7, 10]; // Minor 7
            const note = base * Math.pow(1.059, arpSequence[step % 4]);
            if (step % 2 === 0) this.playSine(time, note, 0.1);
        }
    }

    // === INSTRUMENTS (Shared) ===

    playKick(time, vol = 1.0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(time);
    }

    playHiHat(time, vol = 0.3, open = false) {
        const bufferSize = this.ctx.sampleRate * (open ? 0.3 : 0.05);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
    }

    playBass(time, freq, length) {
        // ... (Same as Ver 1.9)
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time);
        osc.detune.value = -5;
        osc2.detune.value = 5;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 8, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.linearRampToValueAtTime(0, time + length);
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc2.start(time);
        osc.stop(time + length);
        osc2.stop(time + length);
    }

    playHeavySynth(time, freq, vol) {
        // ... (Same as Ver 1.9)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time);
        osc2.detune.value = 10;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 2;
        filter.frequency.setValueAtTime(freq * 6, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.4);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.5);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.5);
        osc2.stop(time + 0.5);
    }

    playSynth(time, freq, vol = 0.1) {
        // ... (Same as Ver 1.9)
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playLaserSynth(time) {
        // ... (Same as Ver 1.9)
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.4);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.4);
    }

    playChord(time, freqs, type = 'sine', duration = 1.0, vol = 0.1) {
        // ... (Same)
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(f, time);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + duration);
        });
    }

    playSine(time, freq, vol) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSaw(time, freq, vol) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playSquare(time, freq, vol = 0.2) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        const vib = this.ctx.createOscillator();
        vib.frequency.value = 5;
        const vibGain = this.ctx.createGain();
        vibGain.gain.value = 10;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);
        vib.start(time);
        vib.stop(time + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.4);
    }

    playDamage() {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(time);
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.3);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.8, time);
        oscGain.gain.linearRampToValueAtTime(0, time + 0.3);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    getCurrentTime() {
        return this.ctx ? this.ctx.currentTime : 0;
    }
}
