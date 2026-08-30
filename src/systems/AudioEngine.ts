import type { EngineProfile } from "../data/mowers";
import type { VacuumMotorProfile } from "../data/vacuums";
import { save } from "./Save";

export interface DriveAudioState {
  throttle: number;
  speed: number;
  cutting: boolean;
  cutIntensity: number;
  steeringLoad?: number;
  terrain?: "lush" | "dry" | "wet" | "autumn" | "farm" | "turf" | "night";
}

function makeNoise(ctx: AudioContext, seconds = 2): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.97 + white * 0.03;
    data[i] = last * 1.6;
  }
  return buf;
}

function makeCutNoise(ctx: AudioContext, seconds = 1.5): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let snap = 0;
  let fibre = 0;
  for (let i = 0; i < data.length; i++) {
    // About 25-35 distinct stalk hits per second. The previous dense impulse
    // bed merged into broadband wind, especially through phone speakers.
    if (Math.random() < 0.0007) snap = (Math.random() * 2 - 1) * (0.62 + Math.random() * 0.38);
    snap *= 0.966;
    fibre = fibre * 0.44 + (Math.random() * 2 - 1) * Math.abs(snap) * 0.16;
    data[i] = Math.max(-1, Math.min(1, snap + fibre));
  }
  return buf;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private engineBus!: GainNode;
  private worldBus!: GainNode;
  private noiseFilter!: BiquadFilterNode;
  private noiseGain!: GainNode;
  private osc: OscillatorNode[] = [];
  private oscGain!: GainNode;
  private lfo!: OscillatorNode;
  private lfoGain!: GainNode;
  private cuttingGain!: GainNode;
  private cutFilter!: BiquadFilterNode;
  private raspFilter!: BiquadFilterNode;
  private raspGain!: GainNode;
  private bladeOsc: OscillatorNode | null = null;
  private bladeHarmonic: OscillatorNode | null = null;
  private bladeGain!: GainNode;
  private bladeHarmonicGain!: GainNode;
  private mechanicalOsc: OscillatorNode | null = null;
  private mechanicalGain!: GainNode;
  private chopOsc: OscillatorNode | null = null;
  private chopGain!: GainNode;
  private chopFilter!: BiquadFilterNode;
  private keepAlive: OscillatorNode | null = null;
  private started = false;
  private profile: EngineProfile = {
    idleHz: 28,
    maxHz: 58,
    rumble: 0.7,
    volume: 0.85,
    cylinders: 2,
  };
  private vacuumProfile: VacuumMotorProfile | null = null;
  private lastVacuumImpact = -1;

  unlock = (): void => {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.buildGraph();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.startEngine();
  };

  private buildGraph(): void {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.engineBus = ctx.createGain();
    this.worldBus = ctx.createGain();
    this.master.connect(ctx.destination);
    this.engineBus.connect(this.master);
    this.worldBus.connect(this.master);

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "lowpass";
    this.noiseFilter.frequency.value = 120;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.0001;
    this.noiseFilter.connect(this.noiseGain).connect(this.engineBus);

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0.0001;
    this.oscGain.connect(this.engineBus);

    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 6;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 4;
    this.lfo.connect(this.lfoGain);

    this.cutFilter = ctx.createBiquadFilter();
    this.cutFilter.type = "bandpass";
    this.cutFilter.frequency.value = 720;
    this.cutFilter.Q.value = 0.55;
    this.cuttingGain = ctx.createGain();
    this.cuttingGain.gain.value = 0;
    this.cutFilter.connect(this.cuttingGain).connect(this.worldBus);

    this.raspFilter = ctx.createBiquadFilter();
    this.raspFilter.type = "bandpass";
    this.raspFilter.frequency.value = 1850;
    this.raspFilter.Q.value = 0.85;
    this.raspGain = ctx.createGain();
    this.raspGain.gain.value = 0;
    this.raspFilter.connect(this.raspGain).connect(this.worldBus);

    this.bladeGain = ctx.createGain();
    this.bladeGain.gain.value = 0.0001;
    this.bladeGain.connect(this.engineBus);
    this.bladeHarmonicGain = ctx.createGain();
    this.bladeHarmonicGain.gain.value = 0.0001;
    this.bladeHarmonicGain.connect(this.engineBus);
    this.mechanicalGain = ctx.createGain();
    this.mechanicalGain.gain.value = 0.0001;
    this.mechanicalGain.connect(this.engineBus);
    this.chopFilter = ctx.createBiquadFilter();
    this.chopFilter.type = "lowpass";
    this.chopFilter.frequency.value = 260;
    this.chopGain = ctx.createGain();
    this.chopGain.gain.value = 0.0001;
    this.chopFilter.connect(this.chopGain).connect(this.worldBus);

    this.keepAlive = ctx.createOscillator();
    const silent = ctx.createGain();
    silent.gain.value = 0.00001;
    this.keepAlive.connect(silent).connect(ctx.destination);
    this.keepAlive.start();

    this.applyVolumes();
  }

  private startEngine(): void {
    if (this.started || !this.ctx) return;
    const ctx = this.ctx;
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(ctx, 3);
    noise.loop = true;
    noise.connect(this.noiseFilter);
    noise.start();

    const cutNoise = ctx.createBufferSource();
    cutNoise.buffer = makeCutNoise(ctx, 1.5);
    cutNoise.loop = true;
    cutNoise.connect(this.cutFilter);
    cutNoise.connect(this.raspFilter);
    cutNoise.start();

    this.bladeOsc = ctx.createOscillator();
    this.bladeOsc.type = "triangle";
    this.bladeOsc.frequency.value = 82;
    this.bladeOsc.connect(this.bladeGain);
    this.bladeOsc.start();

    this.bladeHarmonic = ctx.createOscillator();
    this.bladeHarmonic.type = "sawtooth";
    this.bladeHarmonic.frequency.value = 176;
    this.bladeHarmonic.connect(this.bladeHarmonicGain);
    this.bladeHarmonic.start();

    this.mechanicalOsc = ctx.createOscillator();
    this.mechanicalOsc.type = "sine";
    this.mechanicalOsc.frequency.value = 115;
    this.mechanicalOsc.connect(this.mechanicalGain);
    this.mechanicalOsc.start();

    this.chopOsc = ctx.createOscillator();
    this.chopOsc.type = "square";
    this.chopOsc.frequency.value = 34;
    this.chopOsc.connect(this.chopFilter);
    this.chopOsc.start();

    this.rebuildOsc();
    this.lfo.start();
    this.started = true;
  }

  setProfile(p: EngineProfile): void {
    this.vacuumProfile = null;
    this.profile = p;
    if (this.started) this.rebuildOsc();
  }

  setVacuumProfile(p: VacuumMotorProfile): void {
    this.vacuumProfile = p;
    // The shared Web Audio graph changes character completely here: mower
    // cylinder pulses become a smooth impeller fundamental. Keeping one graph
    // avoids duplicate iOS AudioContexts while the profiles remain distinct.
    this.profile = {
      idleHz: p.idleHz,
      maxHz: p.maxHz,
      rumble: 0.12 + p.airflow * 0.18,
      volume: p.volume,
      cylinders: 2,
    };
    if (this.started) this.rebuildOsc();
    this.applyVolumes();
  }

  setVacuumState(state: { throttle: number; speed: number; suctionLoad: number; brush: boolean; hardFloor: boolean }): void {
    if (!this.ctx || !this.started || !this.vacuumProfile) return;
    const p = this.vacuumProfile;
    const k = Math.max(0, Math.min(1, state.throttle));
    const speed = Math.max(0, Math.min(1, state.speed));
    const load = Math.max(0, Math.min(1, state.suctionLoad));
    const now = this.ctx.currentTime;
    const hz = (p.idleHz + (p.maxHz - p.idleHz) * (0.25 + k * 0.75)) * (1 - load * 0.035);
    for (let i = 0; i < this.osc.length; i++) this.osc[i].frequency.setTargetAtTime(hz * (i + 1), now, 0.06);
    const airflow = 0.045 + p.airflow * (0.055 + k * 0.07) + load * 0.035;
    this.noiseFilter.frequency.setTargetAtTime(620 + p.airflow * 1250 + load * 340, now, 0.07);
    this.noiseGain.gain.setTargetAtTime(airflow, now, 0.07);
    this.oscGain.gain.setTargetAtTime(0.055 + p.whine * 0.065 + k * 0.035, now, 0.06);
    this.lfo.frequency.setTargetAtTime(14 + k * 24, now, 0.08);
    this.bladeOsc?.frequency.setTargetAtTime(310 + p.whine * 580 + k * 170 - load * 38, now, 0.055);
    this.bladeGain.gain.setTargetAtTime(0.012 + p.whine * 0.027, now, 0.08);
    this.bladeHarmonic?.frequency.setTargetAtTime(940 + p.whine * 1320 + k * 360, now, 0.055);
    this.bladeHarmonicGain.gain.setTargetAtTime(0.004 + p.whine * 0.012, now, 0.08);
    this.mechanicalOsc?.frequency.setTargetAtTime(72 + speed * 150, now, 0.08);
    this.mechanicalGain.gain.setTargetAtTime(0.003 + speed * 0.012, now, 0.1);
    this.cutFilter.frequency.setTargetAtTime(state.hardFloor ? 1850 : 1120, now, 0.06);
    this.cuttingGain.gain.setTargetAtTime(load * (state.hardFloor ? 0.022 : 0.034), now, 0.025);
    this.raspFilter.frequency.setTargetAtTime(state.hardFloor ? 2850 : 1980, now, 0.06);
    this.raspGain.gain.setTargetAtTime(load * 0.018, now, 0.025);
    this.chopOsc?.frequency.setTargetAtTime(46 + k * 36, now, 0.05);
    this.chopGain.gain.setTargetAtTime(state.brush ? 0.008 + speed * 0.014 : 0.0001, now, 0.06);
  }

  vacuumImpact(kind: "dust" | "crumb" | "cereal" | "hair" | "petFur" | "leaf" | "confetti" | "dirt" | "sawdust"): void {
    if (!this.ctx || !this.started || save().muted) return;
    if (kind === "dust" || kind === "hair" || kind === "petFur" || kind === "sawdust") return;
    const now = this.ctx.currentTime;
    if (now - this.lastVacuumImpact < 0.045) return;
    this.lastVacuumImpact = now;
    const frequency = kind === "cereal" ? 520 : kind === "crumb" ? 740 : kind === "leaf" ? 145 : kind === "dirt" ? 330 : 910;
    const duration = kind === "leaf" ? 0.11 : 0.055;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === "leaf" ? "sawtooth" : kind === "cereal" || kind === "dirt" ? "square" : "triangle";
    osc.frequency.setValueAtTime(frequency * (.92 + Math.random() * .16), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * .58), now + duration);
    gain.gain.setValueAtTime(kind === "leaf" ? .022 : .035, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.worldBus);
    osc.start(now);
    osc.stop(now + duration + .01);
  }

  private rebuildOsc(): void {
    if (!this.ctx) return;
    for (const o of this.osc) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.osc = [];
    const n = Math.max(1, this.profile.cylinders);
    for (let i = 0; i < n; i++) {
      const o = this.ctx.createOscillator();
      o.type = i === 0 ? "square" : i % 2 ? "triangle" : "sawtooth";
      o.frequency.value = this.profile.idleHz * (i + 1);
      const g = this.ctx.createGain();
      g.gain.value = 0.085 / n;
      this.lfoGain.connect(o.frequency);
      o.connect(g).connect(this.oscGain);
      o.start();
      this.osc.push(o);
    }
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = save();
    const mute = s.muted ? 0 : 1;
    this.master.gain.setTargetAtTime(s.volumes.master * mute, this.ctx.currentTime, 0.05);
    this.engineBus.gain.setTargetAtTime(s.volumes.engine * this.profile.volume, this.ctx.currentTime, 0.05);
    this.worldBus.gain.setTargetAtTime(s.volumes.world, this.ctx.currentTime, 0.05);
  }

  setThrottle(t: number, cutting: boolean, cutIntensity: number): void {
    this.setDriveState({ throttle: t, speed: t, cutting, cutIntensity });
  }

  setDriveState(state: DriveAudioState): void {
    if (!this.ctx || !this.started) return;
    const k = Math.max(0, Math.min(1, state.throttle));
    const speed = Math.max(0, Math.min(1, state.speed));
    const load = Math.max(0, Math.min(1, state.steeringLoad ?? 0));
    const cutLoad = state.cutting ? Math.min(1, 0.18 + state.cutIntensity * 0.045) : 0;
    const freeHz = this.profile.idleHz + (this.profile.maxHz - this.profile.idleHz) * k;
    const hz = freeHz * (1 - cutLoad * (0.025 + this.profile.rumble * 0.018));
    const now = this.ctx.currentTime;
    for (let i = 0; i < this.osc.length; i++) {
      this.osc[i].frequency.setTargetAtTime(hz * (i + 1), now, 0.075);
    }
    this.noiseFilter.frequency.setTargetAtTime(90 + k * 150 + this.profile.rumble * 45, now, 0.08);
    const idle = 0.07 + this.profile.rumble * 0.035;
    const eng = idle + k * 0.42 + load * 0.05 + cutLoad * 0.055;
    this.noiseGain.gain.setTargetAtTime(eng * 0.1, now, 0.08);
    this.oscGain.gain.setTargetAtTime(eng * 0.34, now, 0.055);
    this.lfo.frequency.setTargetAtTime(4 + k * 13, now, 0.1);
    this.bladeOsc?.frequency.setTargetAtTime(72 + k * 46 + speed * 16, now, 0.09);
    this.bladeGain.gain.setTargetAtTime(0.025 + k * 0.055, now, 0.12);
    this.bladeHarmonic?.frequency.setTargetAtTime(154 + k * 104 + speed * 30 - cutLoad * 12, now, 0.08);
    this.bladeHarmonicGain.gain.setTargetAtTime(0.006 + k * 0.014 + cutLoad * 0.009, now, 0.1);
    this.mechanicalOsc?.frequency.setTargetAtTime(105 + speed * 110 + load * 18, now, 0.08);
    this.mechanicalGain.gain.setTargetAtTime(0.008 + speed * 0.022, now, 0.1);
    const cut = state.cutting ? Math.min(1, 0.2 + state.cutIntensity * 0.035) : 0;
    const terrainTone = state.terrain === "dry" || state.terrain === "autumn" ? 930 : state.terrain === "wet" ? 520 : 700;
    this.cutFilter.frequency.setTargetAtTime(terrainTone + speed * 220, now, 0.08);
    this.cuttingGain.gain.setTargetAtTime(cut * 0.044, now, 0.025);
    const raspTone = state.terrain === "dry" || state.terrain === "autumn" ? 2350 : state.terrain === "wet" ? 1280 : 1780;
    this.raspFilter.frequency.setTargetAtTime(raspTone + speed * 380, now, 0.055);
    this.raspGain.gain.setTargetAtTime(cut * (state.terrain === "wet" ? 0.016 : 0.026), now, 0.025);
    this.chopOsc?.frequency.setTargetAtTime(31 + k * 16 + Math.min(10, state.cutIntensity), now, 0.035);
    this.chopFilter.frequency.setTargetAtTime(state.terrain === "wet" ? 190 : state.terrain === "dry" || state.terrain === "autumn" ? 340 : 270, now, 0.05);
    this.chopGain.gain.setTargetAtTime(cut * (0.084 + this.profile.rumble * 0.012), now, 0.025);
  }

  blip(kind: "pickup" | "honk" | "done" | "tap" | "sparkle"): void {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (kind === "honk") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(420, now);
      o.frequency.exponentialRampToValueAtTime(280, now + 0.28);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      o.connect(g).connect(this.worldBus);
      o.start(now);
      o.stop(now + 0.34);
      return;
    }
    if (kind === "done") {
      const notes = [392, 494, 587, 784];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        const t = now + i * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g).connect(this.worldBus);
        o.start(t);
        o.stop(t + 0.42);
      });
      return;
    }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === "sparkle" ? "sine" : "triangle";
    const f = kind === "pickup" ? 880 : kind === "sparkle" ? 1320 : 620;
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 1.4, now + 0.12);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g).connect(this.worldBus);
    o.start(now);
    o.stop(now + 0.2);
  }

  chirpBird(): void {
    if (!this.ctx || !this.started) return;
    if (save().muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const base = 1400 + Math.random() * 800;
    o.frequency.setValueAtTime(base, now);
    o.frequency.exponentialRampToValueAtTime(base * 1.3, now + 0.08);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.16);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    o.connect(g).connect(this.worldBus);
    o.start(now);
    o.stop(now + 0.22);
  }

  stop(): void {
    if (!this.ctx || !this.started) return;
    const now = this.ctx.currentTime;
    this.noiseGain.gain.setTargetAtTime(.0001, now, .04);
    this.oscGain.gain.setTargetAtTime(.0001, now, .04);
    this.bladeGain.gain.setTargetAtTime(.0001, now, .04);
    this.bladeHarmonicGain.gain.setTargetAtTime(.0001, now, .04);
    this.mechanicalGain.gain.setTargetAtTime(.0001, now, .04);
    this.cuttingGain.gain.setTargetAtTime(0, now, .03);
    this.raspGain.gain.setTargetAtTime(0, now, .03);
    this.chopGain.gain.setTargetAtTime(.0001, now, .03);
  }
}

export const audio = new AudioEngine();
