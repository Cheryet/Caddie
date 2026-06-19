/**
 * metronome — Tempo audio engine
 * Wraps react-native-audio-api (Web Audio) to play a synthesised click on the
 * beat. Lives in the tempo feature (not src/core) because only Tempo uses it.
 *
 * Timing uses the canonical Web-Audio "two clocks" pattern (Chris Wilson, "A
 * Tale of Two Clocks"): a coarse JS interval wakes every ~25ms and schedules
 * any beats falling inside a short look-ahead window at absolute times on the
 * audio clock. The clicks are therefore sample-accurate and drift-free even
 * though the JS timer itself jitters — which is exactly why we swapped off the
 * spec's setInterval-driven react-native-sound (see PROJECT_SPEC §8 / TODO.md).
 *
 * The click is a 1kHz oscillator with a fast percussive envelope, so there's
 * no audio asset to bundle. One AudioContext is created lazily on first play
 * and closed on dispose.
 *
 * Used by: useTempo.
 */

import { AudioContext, AudioManager } from 'react-native-audio-api';

export interface Metronome {
  /** Begin clicking at `bpm`. Safe to call when already running (re-syncs). */
  start(bpm: number): void;
  /** Change tempo for subsequent beats (already-scheduled beats are kept). */
  setBpm(bpm: number): void;
  /** Stop clicking; keeps the AudioContext alive for a fast restart. */
  stop(): void;
  /** Stop and release the AudioContext. Call on unmount. */
  dispose(): void;
}

const LOOKAHEAD_MS = 25; // how often the scheduler wakes
const SCHEDULE_AHEAD_S = 0.1; // how far ahead beats are queued
const FIRST_BEAT_OFFSET_S = 0.06; // tiny lead-in so the first click is clean
const CLICK_FREQ_HZ = 1000;
const CLICK_PEAK = 0.6;
const CLICK_FLOOR = 0.0001; // exponential ramps can't touch zero
const CLICK_ATTACK_S = 0.001;
const CLICK_RELEASE_S = 0.04;

export function createMetronome(): Metronome {
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let nextNoteTime = 0;
  let secondsPerBeat = 60 / 72;
  let sessionConfigured = false;

  function ensureContext(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  }

  function configureSession(): void {
    if (sessionConfigured) return;
    // 'playback' so the metronome is audible regardless of the ring switch;
    // 'mixWithOthers' so it coexists with anything else the user is playing.
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosOptions: ['mixWithOthers'],
    });
    sessionConfigured = true;
  }

  function scheduleClick(context: AudioContext, time: number): void {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = CLICK_FREQ_HZ;
    osc.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(CLICK_FLOOR, time);
    gain.gain.exponentialRampToValueAtTime(CLICK_PEAK, time + CLICK_ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(CLICK_FLOOR, time + CLICK_RELEASE_S);
    osc.start(time);
    osc.stop(time + CLICK_RELEASE_S);
  }

  function tick(): void {
    const context = ctx;
    if (!context) return;
    while (nextNoteTime < context.currentTime + SCHEDULE_AHEAD_S) {
      scheduleClick(context, nextNoteTime);
      nextNoteTime += secondsPerBeat;
    }
  }

  function start(bpm: number): void {
    configureSession();
    const context = ensureContext();
    // Activate the session, then let the first scheduled oscillator start the
    // engine. We deliberately do NOT call context.resume(): in audio-api 0.12
    // resume() starts the AVAudioEngine on a worker thread while osc.start()
    // starts it on the JS thread, and the two race inside the unsynchronised
    // source-node map (materializeSourceNodeWithId) → SIGSEGV. One start path.
    AudioManager.setAudioSessionActivity(true).catch(() => {});
    secondsPerBeat = 60 / bpm;
    nextNoteTime = context.currentTime + FIRST_BEAT_OFFSET_S;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, LOOKAHEAD_MS);
    tick();
  }

  function setBpm(bpm: number): void {
    secondsPerBeat = 60 / bpm;
  }

  function stop(): void {
    // Pause scheduling only — keep the AudioContext, engine and audio session
    // alive so the next start() produces sound. Deactivating the session here
    // stops the AVAudioEngine while the context stays 'running', so it won't
    // restart on the next play (and we can't call resume() — that races the
    // engine start and crashes). The session is released in dispose().
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function dispose(): void {
    stop();
    AudioManager.setAudioSessionActivity(false).catch(() => {});
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
    sessionConfigured = false;
  }

  return { start, setBpm, stop, dispose };
}
