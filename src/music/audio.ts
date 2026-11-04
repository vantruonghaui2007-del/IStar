import { INSTRUMENTS, type InstrumentId } from './instruments'
import type { SoundOutput } from './player'
import { frequency, semitoneOf } from './scale'
import type { MusicEvent } from './score'

type Voice = { setPitch: (hz: number) => void; release: (seconds: number, at?: number) => void }

/**
 * Synthesised traditional instruments (Web Audio, no sample files, works
 * offline). Approximations made for interaction, not recordings:
 * - đàn bầu: harmonic-rich tone with slow vibrato and glides (luyến);
 * - sáo trúc: breathy sine with vibrato;
 * - đàn tranh: Karplus–Strong plucked string;
 * - đàn nguyệt: bright plucked harmonics with a short decay;
 * - đàn tỳ bà: crisp plucked harmonics with a quick attack and decay;
 * - trống cơm: pitched membrane with a short slap, low “tùng” / high “tình”.
 */
export class AudioEngine implements SoundOutput {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private dry: GainNode | null = null
  private noise: AudioBuffer | null = null
  private readonly voices = new Map<string, Voice>()
  private readonly strings = new Map<number, AudioBuffer>()
  private muted = false
  onStateChange: ((state: AudioContextState | 'off') => void) | null = null

  /** Must run inside a user gesture (click, key, pointer) the first time. */
  unlock() {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) return
      const context = new Context({ latencyHint: 'interactive' })
      this.context = context
      context.onstatechange = () => this.onStateChange?.(context.state)
      this.build(context)
    }
    if (this.context.state === 'suspended') void this.context.resume()
    this.onStateChange?.(this.context.state)
  }

  get state(): AudioContextState | 'off' {
    return this.context?.state ?? 'off'
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.context.currentTime, 0.05)
  }

  play(instrument: InstrumentId, strokeId: string, event: MusicEvent) {
    const context = this.context
    if (!context || !this.dry || context.state !== 'running') return
    const now = context.currentTime
    if (event.kind === 'release') {
      this.voices.get(strokeId)?.release(instrument === 'dan-bau' ? 1.8 : (instrument === 'dan-nguyet' || instrument === 'dan-ty-ba') ? 0.7 : 0.18)
      this.voices.delete(strokeId)
      return
    }
    const hz = frequency(INSTRUMENTS[instrument].baseMidi, semitoneOf(event.degree))
    if (event.kind === 'glide') {
      this.voices.get(strokeId)?.setPitch(hz)
      return
    }
    this.voices.get(strokeId)?.release(0.15)
    this.voices.delete(strokeId)
    if (instrument === 'dan-bau') this.voices.set(strokeId, this.bau(context, hz, now, this.dry))
    else if (instrument === 'sao-truc') this.voices.set(strokeId, this.sao(context, hz, now, this.dry))
    else if (instrument === 'dan-tranh') this.tranh(context, hz, now, this.dry)
    else if (instrument === 'dan-nguyet' || instrument === 'dan-ty-ba') this.voices.set(strokeId, this.pluckedLute(context, hz, now, this.dry, instrument === 'dan-ty-ba'))
    else this.trong(context, event.degree, now, this.dry)
  }

  stop(strokeId: string) {
    this.voices.get(strokeId)?.release(0.25)
    this.voices.delete(strokeId)
  }

  private build(context: AudioContext) {
    const master = context.createGain()
    master.gain.value = this.muted ? 0 : 0.8
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.ratio.value = 4
    master.connect(compressor).connect(context.destination)
    const dry = context.createGain()
    dry.connect(master)
    const reverb = context.createConvolver()
    reverb.buffer = this.impulse(context, 2.4)
    const wet = context.createGain()
    wet.gain.value = 0.28
    dry.connect(reverb).connect(wet).connect(master)
    this.master = master
    this.dry = dry
    this.noise = this.noiseBuffer(context, 2)
  }

  private impulse(context: AudioContext, seconds: number) {
    const length = Math.floor(context.sampleRate * seconds)
    const buffer = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
    }
    return buffer
  }

  private noiseBuffer(context: AudioContext, seconds: number) {
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  private vibrato(context: AudioContext, targets: AudioParam[], rate: number, depth: number, delay: number, now: number) {
    const lfo = context.createOscillator()
    lfo.frequency.value = rate
    const amount = context.createGain()
    amount.gain.setValueAtTime(0, now)
    amount.gain.setTargetAtTime(depth, now + delay, 0.25)
    lfo.connect(amount)
    targets.forEach(param => amount.connect(param))
    lfo.start(now)
    return lfo
  }

  private fadeOut(context: AudioContext, param: AudioParam, seconds: number, at?: number) {
    const from = at ?? context.currentTime
    param.setValueAtTime(param.value, from)
    param.setTargetAtTime(0.0001, from, seconds / 3)
    return from
  }

  private bau(context: AudioContext, hz: number, now: number, dest: AudioNode): Voice {
    const out = context.createGain()
    out.gain.setValueAtTime(0.0001, now)
    out.gain.linearRampToValueAtTime(0.35, now + 0.02)
    out.gain.setTargetAtTime(0.18, now + 0.15, 0.4)
    out.connect(dest)
    const oscs: OscillatorNode[] = []
    const weights = [1, 0.8, 0.6, 0.45, 0.35, 0.25, 0.18, 0.12]
    const detunes: AudioParam[] = []
    for (let i = 0; i < weights.length; i++) {
      const osc = context.createOscillator()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(hz * (i + 1), now)
      const gain = context.createGain()
      gain.gain.value = weights[i] / (i + 1)
      osc.connect(gain).connect(out)
      osc.start(now)
      oscs.push(osc)
      detunes.push(osc.detune)
    }
    const lfo = this.vibrato(context, detunes, 4.8, 14, 0.3, now)
    return {
      setPitch: next => {
        const at = context.currentTime
        oscs.forEach((osc, i) => osc.frequency.setTargetAtTime(next * (i + 1), at, 0.04))
      },
      release: (seconds, at) => {
        const from = this.fadeOut(context, out.gain, seconds, at)
        oscs.forEach(osc => osc.stop(from + seconds + 0.05))
        lfo.stop(from + seconds + 0.05)
      },
    }
  }

  private sao(context: AudioContext, hz: number, now: number, dest: AudioNode): Voice {
    const out = context.createGain()
    out.gain.setValueAtTime(0.0001, now)
    out.gain.linearRampToValueAtTime(0.42, now + 0.04)
    out.connect(dest)
    const body = context.createOscillator()
    body.type = 'sine'
    body.frequency.setValueAtTime(hz, now)
    const edge = context.createOscillator()
    edge.type = 'triangle'
    edge.frequency.setValueAtTime(hz * 2, now)
    const edgeGain = context.createGain()
    edgeGain.gain.value = 0.05
    body.connect(out)
    edge.connect(edgeGain).connect(out)
    const breath = context.createBufferSource()
    breath.buffer = this.noise
    breath.loop = true
    const band = context.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = hz * 2
    band.Q.value = 3
    const breathGain = context.createGain()
    breathGain.gain.value = 0.06
    breath.connect(band).connect(breathGain).connect(out)
    body.start(now)
    edge.start(now)
    breath.start(now)
    const lfo = this.vibrato(context, [body.detune, edge.detune], 5.4, 12, 0.45, now)
    return {
      setPitch: next => {
        const at = context.currentTime
        body.frequency.setTargetAtTime(next, at, 0.03)
        edge.frequency.setTargetAtTime(next * 2, at, 0.03)
        band.frequency.setTargetAtTime(next * 2, at, 0.03)
      },
      release: (seconds, at) => {
        const from = this.fadeOut(context, out.gain, seconds, at)
        for (const node of [body, edge, breath, lfo]) node.stop(from + seconds + 0.05)
      },
    }
  }

  private pluckedLute(context: AudioContext, hz: number, now: number, dest: AudioNode, tyBa: boolean): Voice {
    const out = context.createGain()
    out.gain.setValueAtTime(0.0001, now)
    out.gain.exponentialRampToValueAtTime(tyBa ? 0.4 : 0.48, now + 0.006)
    out.gain.exponentialRampToValueAtTime(0.0001, now + (tyBa ? 1.5 : 2.2))
    out.connect(dest)
    const tone = context.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.setValueAtTime(tyBa ? 7200 : 5800, now)
    tone.frequency.exponentialRampToValueAtTime(1200, now + (tyBa ? 0.9 : 1.5))
    tone.connect(out)
    const weights = tyBa ? [1, 0.85, 0.65, 0.42, 0.3, 0.18] : [1, 0.7, 0.45, 0.3, 0.2, 0.1]
    const oscillators = weights.map((weight, i) => {
      const osc = context.createOscillator()
      osc.frequency.setValueAtTime(hz * (i + 1), now)
      const gain = context.createGain()
      gain.gain.value = weight / 2
      osc.connect(gain).connect(tone)
      osc.start(now)
      return osc
    })
    const friction = context.createBufferSource()
    friction.buffer = this.noise
    friction.loop = true
    const band = context.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = hz * 3
    band.Q.value = 1.5
    const texture = context.createGain()
    texture.gain.setValueAtTime(tyBa ? 0.24 : 0.18, now)
    texture.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)
    friction.connect(band).connect(texture).connect(out)
    friction.start(now)
    const lfo = this.vibrato(context, oscillators.map(osc => osc.detune), 4.5, tyBa ? 5 : 7, 0.12, now)
    return {
      setPitch: next => {
        const at = context.currentTime
        oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(next * (i + 1), at, 0.025))
        band.frequency.setTargetAtTime(next * 3, at, 0.04)
      },
      release: (seconds, at) => {
        // A tap can start and end in one frame; let its attack sound before fading.
        const from = Math.max(at ?? context.currentTime, now + 0.012)
        out.gain.cancelAndHoldAtTime(from)
        out.gain.setTargetAtTime(0.0001, from, seconds / 3)
        for (const node of [...oscillators, friction, lfo]) node.stop(from + seconds + 0.05)
      },
    }
  }

  /** Karplus–Strong: a burst of noise circulating in a short, slowly damped delay line. */
  private stringBuffer(context: AudioContext, hz: number) {
    const key = Math.round(hz * 10)
    const cached = this.strings.get(key)
    if (cached) return cached
    const rate = context.sampleRate
    const buffer = context.createBuffer(1, Math.floor(rate * 2.6), rate)
    const data = buffer.getChannelData(0)
    const period = Math.max(2, Math.round(rate / hz))
    for (let i = 0; i < period; i++) data[i] = (Math.random() * 2 - 1) * 0.9
    for (let i = period; i < data.length; i++) data[i] = 0.4985 * (data[i - period] + data[i - period - 1 >= 0 ? i - period - 1 : 0])
    this.strings.set(key, buffer)
    return buffer
  }

  private tranh(context: AudioContext, hz: number, now: number, dest: AudioNode) {
    const source = context.createBufferSource()
    source.buffer = this.stringBuffer(context, hz)
    const gain = context.createGain()
    gain.gain.value = 0.5
    const tone = context.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 4200
    source.connect(tone).connect(gain).connect(dest)
    source.start(now)
  }

  private trong(context: AudioContext, degree: number, now: number, dest: AudioNode) {
    const high = degree >= 5
    const membrane = context.createOscillator()
    membrane.type = 'sine'
    membrane.frequency.setValueAtTime(high ? 230 : 120, now)
    membrane.frequency.exponentialRampToValueAtTime(high ? 175 : 72, now + (high ? 0.12 : 0.2))
    const body = context.createGain()
    body.gain.setValueAtTime(0.0001, now)
    body.gain.exponentialRampToValueAtTime(high ? 0.55 : 0.9, now + 0.005)
    body.gain.exponentialRampToValueAtTime(0.0001, now + (high ? 0.25 : 0.55))
    membrane.connect(body).connect(dest)
    membrane.start(now)
    membrane.stop(now + 0.6)
    const slap = context.createBufferSource()
    slap.buffer = this.noise
    const filter = context.createBiquadFilter()
    filter.type = high ? 'highpass' : 'lowpass'
    filter.frequency.value = high ? 1500 : 500
    const slapGain = context.createGain()
    slapGain.gain.setValueAtTime(high ? 0.35 : 0.25, now)
    slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    slap.connect(filter).connect(slapGain).connect(dest)
    slap.start(now)
    slap.stop(now + 0.06)
  }
}
