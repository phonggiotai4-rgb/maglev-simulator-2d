/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Continuous sound nodes
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  private windNoiseNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  private lastContact: boolean = false;
  private lastAlertTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Motor Inverter & LSM hum (Dual Sawtooth/Sine harmonized)
      this.motorOsc1 = this.ctx.createOscillator();
      this.motorOsc1.type = 'sawtooth';
      this.motorOsc1.frequency.setValueAtTime(40, this.ctx.currentTime);

      this.motorOsc2 = this.ctx.createOscillator();
      this.motorOsc2.type = 'sine';
      this.motorOsc2.frequency.setValueAtTime(80, this.ctx.currentTime);

      const motorFilter = this.ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.motorOsc1.connect(motorFilter);
      this.motorOsc2.connect(motorFilter);
      motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.masterGain);

      this.motorOsc1.start();
      this.motorOsc2.start();

      // 2. Wind aerodynamic turbulence (white noise through bandpass)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.windNoiseNode = this.ctx.createBufferSource();
      this.windNoiseNode.buffer = noiseBuffer;
      this.windNoiseNode.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.windNoiseNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);

      this.windNoiseNode.start();

      // 3. Skid metal friction noise
      const skidBufferSource = this.ctx.createBufferSource();
      skidBufferSource.buffer = noiseBuffer;
      skidBufferSource.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'highpass';
      this.skidFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

      skidBufferSource.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.masterGain);

      skidBufferSource.start();
    } catch {
      // Audio not supported or blocked
    }
  }

  public updateAudio(
    speedMps: number,
    throttle: number,
    isContact: boolean,
    isGapCritical: boolean,
    isPlaying: boolean
  ) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!isPlaying || this.isMuted) {
      if (this.motorGain) this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      if (this.windGain) this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      if (this.skidGain) this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }

    const speedKmh = speedMps * 3.6;
    const now = this.ctx.currentTime;

    // Motor sound: pitch scales with velocity + throttle load
    if (this.motorOsc1 && this.motorOsc2 && this.motorGain) {
      const baseFreq = 50 + speedKmh * 1.25 + Math.abs(throttle) * 60;
      this.motorOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2.1, now, 0.05);

      const motorVol = Math.min(0.4, 0.02 + Math.abs(throttle) * 0.25 + (speedKmh / 600) * 0.15);
      this.motorGain.gain.setTargetAtTime(motorVol, now, 0.05);
    }

    // Wind sound: grows with v^2
    if (this.windGain && this.windFilter) {
      const windVol = Math.min(0.5, Math.pow(speedKmh / 500, 2) * 0.45);
      this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
      const centerFreq = 180 + Math.min(2200, speedKmh * 3.5);
      this.windFilter.frequency.setTargetAtTime(centerFreq, now, 0.1);
    }

    // Skid friction sound: only when contact at speed
    if (this.skidGain) {
      const skidVol = (isContact && speedKmh > 5) ? Math.min(0.4, (speedKmh / 200) * 0.35) : 0;
      this.skidGain.gain.setTargetAtTime(skidVol, now, 0.03);
    }

    // Impact / Touchdown thump
    if (isContact && !this.lastContact && speedKmh > 20) {
      this.playThump();
    }
    this.lastContact = isContact;

    // Warning alarm on critical gap collapse
    if (isGapCritical && Date.now() - this.lastAlertTime > 900) {
      this.playWarningBeep();
      this.lastAlertTime = Date.now();
    }
  }

  public playThump() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {
      // Audio error ignored
    }
  }

  public playWarningBeep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.setValueAtTime(988, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.17);
    } catch {
      // Audio error ignored
    }
  }

  public playClick() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio error ignored
    }
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundFx = new SoundManager();
