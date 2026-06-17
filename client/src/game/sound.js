// client/src/game/sound.js
// Tiny sound layer for the game, synthesized with the Web Audio API.
// No audio files: every sound is generated from an oscillator, so there
// are no assets to load, host, or license.
//
// Browsers forbid starting an AudioContext before a user gesture (you saw
// the "AudioContext was prevented from starting" warning in the console).
// So we create the context lazily, on the first sound played. Since the
// first sound always follows a click on Run, the context is allowed to
// start. If the browser still refuses, every call fails silently: sound
// is a bonus, never a blocker for the game.

let audioCtx = null

// Returns a running AudioContext, creating it on first use. Returns null
// if the browser has no Web Audio support, so callers can no-op safely.
function getContext() {
  if (audioCtx) {
    // A context can be suspended if it was created before a gesture;
    // resume it now that we are inside one.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  }
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  try {
    audioCtx = new Ctx()
    return audioCtx
  } catch {
    return null
  }
}

// Plays a single tone: a frequency for a duration, with a quick fade-out
// so it does not click. `type` is the oscillator waveform.
//
// @param {number} freq      - frequency in Hz
// @param {number} duration  - seconds
// @param {string} type      - 'sine' | 'square' | 'triangle' | 'sawtooth'
// @param {number} volume    - 0..1, kept low so sounds stay discreet
function tone(freq, duration, type = 'square', volume = 0.15) {
  const ctx = getContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq

  // Fade the gain down to near-zero over the duration so the note ends
  // softly instead of cutting with an audible click.
  const now = ctx.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)
}

// One short blip per step. Low-ish square wave, very short.
export function playMove() {
  tone(220, 0.08, 'square', 0.12)
}

// A softer, shorter tick for turning, so repeated turns do not grate.
// Sine wave is gentler than the square move blip.
export function playTurn() {
  tone(330, 0.06, 'sine', 0.08)
}

// A lower, punchier sound for a hit.
export function playAttack() {
  tone(110, 0.18, 'sawtooth', 0.18)
}

// Two rising notes for a win, scheduled back to back.
export function playWin() {
  tone(523, 0.12, 'triangle', 0.18) // C5
  const ctx = getContext()
  if (!ctx) return
  // Schedule the second note slightly later via a timer; simplest way
  // without juggling oscillator start offsets across two tone() calls.
  setTimeout(() => tone(784, 0.18, 'triangle', 0.18), 110) // G5
}