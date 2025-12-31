
class AudioService {
  private ctx: AudioContext | null = null;
  private lastStepTime = 0;
  private stepInterval = 0.35; // Seconds between steps
  
  private ambienceTimeout: any = null;
  private isAmbienceActive = false;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
  }

  // --- AMBIENCE LOOP ---

  public startAmbience() {
    this.resume();
    if (this.isAmbienceActive) return;
    this.isAmbienceActive = true;
    this.scheduleNextAmbience();
  }

  public stopAmbience() {
    this.isAmbienceActive = false;
    if (this.ambienceTimeout) {
      clearTimeout(this.ambienceTimeout);
      this.ambienceTimeout = null;
    }
  }

  private scheduleNextAmbience() {
    if (!this.isAmbienceActive) return;
    // Schedule next sound in 2-7 seconds
    const delay = Math.random() * 5000 + 2000; 
    this.ambienceTimeout = setTimeout(() => {
        if (!this.isAmbienceActive) return;
        
        // 60% chance for drip, 40% for chirp
        if (Math.random() > 0.4) {
             this.playDrip();
        } else {
             this.playChirp();
        }
        this.scheduleNextAmbience();
    }, delay);
  }

  private playDrip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Sine wave dropping in pitch slightly
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    
    // Quick blip envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    // Add some reverb-like delay for "cave" feel
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.15 + Math.random() * 0.05;
    const delayGain = this.ctx.createGain();
    delayGain.gain.value = 0.3;

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Effect path
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  private playChirp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Create a few short pulses to simulate a cricket/bug
    const count = Math.floor(Math.random() * 3) + 2;
    const baseFreq = 4000 + Math.random() * 1000;

    for(let i=0; i<count; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + (i * 0.06);

        osc.type = 'sawtooth';
        osc.frequency.value = baseFreq;
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
        
        // Highpass to make it thin and insect-like
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2500;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(start);
        osc.stop(start + 0.1);
    }
  }

  // --- SOUND GENERATORS ---

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1, slideTo?: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol: number, filterFreq: number = 1000) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  // --- GAMEPLAY SFX ---

  public playWalk(isSprinting: boolean) {
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const interval = isSprinting ? 0.2 : 0.35;
    
    if (now - this.lastStepTime > interval) {
        // Deep Thump implementation
        // Low sine drop for "thud" weight
        this.playTone(80, 'sine', 0.1, 0.4, 30);
        // Very low filtered noise for surface contact
        this.playNoise(0.08, 0.2, 120 + Math.random() * 40);
        
        this.lastStepTime = now;
    }
  }

  public playAttack() {
    this.resume();
    // Sharp bite sound
    this.playTone(600, 'sawtooth', 0.1, 0.15, 200);
    this.playNoise(0.1, 0.1, 2000);
  }

  public playDamage() {
    this.resume();
    // Low thud/impact
    this.playTone(150, 'square', 0.2, 0.2, 50);
    this.playNoise(0.2, 0.2, 500);
  }

  public playEnemyDeath() {
    this.resume();
    // Squish sound
    this.playTone(300, 'sawtooth', 0.15, 0.1, 50);
    this.playNoise(0.2, 0.25, 1200);
  }

  public playPickup(type: 'GOLD' | 'HEAL' | 'STAMINA') {
    this.resume();
    if (type === 'GOLD') {
        // High ping
        this.playTone(1200, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.1), 80);
    } else if (type === 'HEAL') {
        // Rising pleasant sound
        this.playTone(400, 'triangle', 0.3, 0.1, 800);
    } else {
        // Quick blip
        this.playTone(800, 'square', 0.1, 0.05);
    }
  }

  public playLevelComplete() {
    this.resume();
    // Victory fanfare (Major Arpeggio)
    const now = 0;
    setTimeout(() => this.playTone(523.25, 'triangle', 0.4, 0.2), 0);   // C
    setTimeout(() => this.playTone(659.25, 'triangle', 0.4, 0.2), 150); // E
    setTimeout(() => this.playTone(783.99, 'triangle', 0.4, 0.2), 300); // G
    setTimeout(() => this.playTone(1046.50, 'square', 0.8, 0.2), 450);  // High C
  }
  
  public playGameOver() {
    this.resume();
    // Sad descending drone
    this.playTone(300, 'sawtooth', 1.5, 0.2, 50);
    this.playNoise(1.0, 0.2, 200);
  }
}

export const audioService = new AudioService();
