/* ============================================================================
   SOUND.JS — slapstick cartoon audio, 100% code-generated (WebAudio).
   ----------------------------------------------------------------------------
   No sound files! Every effect is built from oscillators and noise right
   here, so the game stays a folder of text files and works offline.

   WANT A NEW SOUND? Add a function that calls tone()/noise() and export it
   at the bottom. Call it from anywhere as TP_SOUND.yourSound().

   Browsers only allow audio AFTER the player has clicked or pressed a key —
   that's why init() is wired to the first user gesture in main.js.
   ========================================================================== */

(function () {
    'use strict';

    let ctx = null;          // the AudioContext (created on first gesture)
    let master = null;       // master volume knob
    let muted = false;

    try { muted = localStorage.getItem('tp_muted') === '1'; } catch {}

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = muted ? 0 : 0.5;
            master.connect(ctx.destination);
        } catch { /* no audio support — play silent */ }
    }

    /** One synth note. type: sine/square/triangle/sawtooth.
        Pitch slides from f0 to f1 over `dur` seconds — that slide is what
        makes things sound cartoony (boings go up, falls go down). */
    function tone(type, f0, f1, dur, vol, delay = 0) {
        if (!ctx || muted) return;
        const t = ctx.currentTime + delay;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.02);
    }

    /** A burst of noise (crashes, fizz). bp = bandpass center frequency. */
    function noise(dur, vol, bp, delay = 0) {
        if (!ctx || muted) return;
        const t = ctx.currentTime + delay;
        const len = Math.ceil(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let node = src;
        if (bp) {
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 0.8;
            src.connect(f); node = f;
        }
        node.connect(g); g.connect(master);
        src.start(t);
    }

    /* ------------------------------------------------------------------
       THE EFFECTS — tuned by ear for maximum cartoon
       ------------------------------------------------------------------ */
    const fx = {
        /** UI button press */
        click()  { tone('square', 660, 880, 0.06, 0.15); },

        /** part snapped onto the machine */
        snap()   { tone('square', 220, 440, 0.08, 0.3); tone('square', 440, 330, 0.06, 0.2, 0.06); },

        /** part picked back up off the machine */
        unsnap() { tone('square', 440, 220, 0.09, 0.25); },

        /** GO! launch whoosh */
        launch() { noise(0.5, 0.35, 900); tone('sawtooth', 120, 480, 0.5, 0.22); },

        /** eject kick — the classic rising BOING */
        boing()  { tone('sine', 140, 520, 0.22, 0.45); tone('sine', 280, 1040, 0.22, 0.18); },

        /** mattress spring — bigger, bouncier boing */
        spring() { tone('sine', 90, 700, 0.32, 0.5); tone('triangle', 180, 1400, 0.3, 0.2); },

        /** balloon pop */
        pop()    { noise(0.09, 0.5, 2400); tone('square', 880, 220, 0.07, 0.25); },

        /** soda bottle blast-off */
        fizz()   { noise(0.6, 0.45, 3200); tone('sawtooth', 200, 900, 0.45, 0.3); },

        /** landing thud — strength 0..1 scales the oomph */
        thud(s = 0.5) {
            noise(0.12 + s * 0.1, 0.25 + s * 0.3, 300);
            tone('sine', 120, 50, 0.15 + s * 0.1, 0.3 + s * 0.25);
        },

        /** jar taking damage — glassy clink + crunch */
        crack()  { tone('triangle', 1800, 900, 0.08, 0.35); noise(0.15, 0.3, 1400, 0.02); },

        /** the jar is gone — big sad crash */
        shatter() {
            noise(0.5, 0.5, 1800);
            tone('triangle', 1400, 300, 0.4, 0.3);
            // sad trombone-ish fall
            tone('sawtooth', 300, 150, 0.7, 0.25, 0.35);
        },

        /** TNT — deep cartoon kaboom */
        boom() {
            noise(0.5, 0.6, 480);
            tone('sine', 90, 36, 0.5, 0.5);
            noise(0.25, 0.35, 1600, 0.04);
        },

        /** star box collected */
        star()   { tone('sine', 880, 1320, 0.12, 0.35); tone('sine', 1100, 1760, 0.16, 0.3, 0.1); },

        /** level complete — a happy little jingle */
        win() {
            const notes = [523, 659, 784, 1047];          // C E G C — ta-da!
            notes.forEach((f, i) => tone('triangle', f, f, 0.22, 0.32, i * 0.12));
            tone('triangle', 1319, 1319, 0.4, 0.25, 0.5);
        },

        /** run over — descending womp womp */
        lose() {
            tone('sawtooth', 220, 196, 0.3, 0.3);
            tone('sawtooth', 196, 147, 0.5, 0.3, 0.32);
        }
    };

    /* ------------------------------------------------------------------
       BACKGROUND MUSIC — an original, jaunty little workshop tune that
       loops forever. Written as note tables (frequencies in Hz, 0 = rest)
       and scheduled a beat ahead so it never stutters.
       ------------------------------------------------------------------ */
    // 16 eighth-note steps of melody (two bars), simple and bouncy:
    const MELODY = [523, 659, 784, 659,  880, 784, 659, 587,
                    523, 659, 784, 880,  784, 659, 587, 0];
    // 8 quarter-note bass steps underneath:
    const BASS = [131, 196, 175, 196,  131, 196, 220, 196];

    let musicTimer = null;
    let nextNoteTime = 0;
    let stepIdx = 0;

    function scheduleMusic() {
        if (!ctx) return;
        const stepDur = 60 / 132 / 2;              // eighth notes at 132 bpm
        // keep ~0.4s of notes queued ahead of "now"
        while (nextNoteTime < ctx.currentTime + 0.4) {
            const delay = nextNoteTime - ctx.currentTime;
            const m = MELODY[stepIdx % MELODY.length];
            if (m) tone('triangle', m, m, stepDur * 0.9, 0.06, delay);
            if (stepIdx % 2 === 0) {               // bass on the beat
                const b = BASS[(stepIdx / 2) % BASS.length];
                if (b) tone('square', b, b, stepDur * 1.6, 0.045, delay);
            }
            nextNoteTime += stepDur;
            stepIdx++;
        }
    }

    function startMusic() {
        if (!ctx || musicTimer) return;
        nextNoteTime = ctx.currentTime + 0.1;
        stepIdx = 0;
        musicTimer = setInterval(scheduleMusic, 200);
    }

    /* Public API ------------------------------------------------------------ */
    window.TP_SOUND = Object.assign({
        init() {
            init();
            startMusic();      // music starts with the first user gesture
        },
        get muted() { return muted; },
        toggleMute() {
            muted = !muted;
            if (master) master.gain.value = muted ? 0 : 0.5;
            try { localStorage.setItem('tp_muted', muted ? '1' : '0'); } catch {}
            return muted;
        }
    }, fx);
})();
