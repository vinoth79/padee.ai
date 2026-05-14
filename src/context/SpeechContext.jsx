// ═══════════════════════════════════════════════════════════════════════════
// SpeechContext — single source of truth for in-app TTS playback.
// ═══════════════════════════════════════════════════════════════════════════
// Why context: previously each `useSpeech()` call held its own audio + state,
// so two ListenButtons rendered side by side were independent. With the
// provider, only ONE TTS plays at a time across the app, and any component
// (e.g. PaMascot) can subscribe to `{ speaking, loading }` to react visually
// while speech is active.
//
// Two backends are tried in order, same as before:
//   1. Server: POST /api/ai/tts → Google Cloud TTS (en-IN-Wavenet-D), MP3 over HTTP
//   2. Browser: window.speechSynthesis (free, on-device, robotic)
// On any server failure (not configured / network / playback) we fall back
// to the browser engine.
// ═══════════════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { latexToSpeech } from '../lib/latexToSpeech'

const RATE_KEY = 'padee-speech-rate'

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!key) return null
    return JSON.parse(localStorage.getItem(key))?.access_token || null
  } catch { return null }
}

// Strip markdown + unparse LaTeX so TTS reads natural English.
function prepare(text) {
  if (!text) return ''
  const noLatex = latexToSpeech(String(text))
  return noLatex
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickBrowserVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return (
    voices.find(v => v.lang === 'en-IN')
    || voices.find(v => v.lang === 'en-GB')
    || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'))
    || voices[0]
  )
}

// ─── Context ─────────────────────────────────────────────────────────────
const SpeechContext = createContext(null)

const NULL_VALUE = {
  supported: false, speaking: false, loading: false, rate: 1,
  speak: () => {}, stop: () => {}, toggle: () => {}, setRate: () => {},
  // Sprint 3 / F6a — karaoke highlight state. activeText is the source string
  // being spoken; activeSentenceIndex is the 0-based index of the currently
  // spoken sentence inside that string. Components that render the same text
  // can compare activeText === msg.text and apply highlight CSS.
  activeText: null, activeSentenceIndex: -1,
}

// Sentence segmentation. Hindi uses `।` (purna viram, U+0964) as the primary
// sentence terminator; English uses `.`/`!`/`?`. We keep the terminator with
// the sentence so highlighted spans don't lose their punctuation.
//
// Exported so other modules (e.g. MathText) can split identically — keeps
// sentence indices in sync between the audio-tick logic and the rendered
// spans.
export function splitSentences(text) {
  if (!text) return []
  // Match a run of non-terminator chars followed by an optional terminator
  // and trailing whitespace. The terminator stays attached.
  const re = /[^।.!?]+[।.!?]*\s*/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const seg = m[0]
    if (seg.trim().length > 0) out.push(seg)
  }
  // Fallback: if the regex produced nothing (e.g. text has no terminators),
  // return the whole text as one sentence.
  if (out.length === 0 && text.trim().length > 0) out.push(text)
  return out
}

export function useSpeech() {
  const ctx = useContext(SpeechContext)
  return ctx || NULL_VALUE
}

// ─── Provider ────────────────────────────────────────────────────────────
export function SpeechProvider({ children }) {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rate, setRateState] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem(RATE_KEY))
      return Number.isFinite(saved) && saved >= 0.5 && saved <= 2 ? saved : 1
    } catch { return 1 }
  })
  // F6a — karaoke highlight state
  const [activeText, setActiveText] = useState(null)
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1)

  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)
  const utteranceRef = useRef(null)
  const abortRef = useRef(null)
  const trackerRef = useRef(null)        // setInterval handle for the karaoke tick
  const sentenceOffsetsRef = useRef([])  // cumulative char offsets per sentence end (for both backends)

  // Feature-detect once
  useEffect(() => {
    const hasAudio = typeof window !== 'undefined' && typeof window.Audio === 'function'
    const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window
    setSupported(hasAudio || hasSpeech)
    if (hasSpeech) window.speechSynthesis.getVoices() // kick voice load
  }, [])

  function cleanup() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (trackerRef.current) {
      clearInterval(trackerRef.current)
      trackerRef.current = null
    }
    sentenceOffsetsRef.current = []
    setSpeaking(false)
    setLoading(false)
    setActiveText(null)
    setActiveSentenceIndex(-1)
  }

  // Compute cumulative end-offsets for each sentence in `prepared` (the text
  // that's actually being read aloud — post-prepare() so it matches what TTS
  // gets). offsets[i] = end-position in `prepared` of sentence i.
  // Used by the karaoke tick to pick the active sentence from progress.
  function computeSentenceOffsets(prepared) {
    const sentences = splitSentences(prepared)
    const ends = []
    let pos = 0
    for (const s of sentences) {
      pos += s.length
      ends.push(pos)
    }
    return ends
  }

  // Karaoke tick — runs every 250ms while audio plays. For the server backend
  // we use audio.currentTime / audio.duration → progress %. For the browser
  // backend we use the onBoundary event (more precise) and fall back to a
  // wall-clock estimate if boundaries don't fire.
  function startTrackerForAudio(audio, prepared, sourceText) {
    const offsets = computeSentenceOffsets(prepared)
    sentenceOffsetsRef.current = offsets
    setActiveText(sourceText)
    setActiveSentenceIndex(offsets.length > 0 ? 0 : -1)
    if (trackerRef.current) clearInterval(trackerRef.current)
    trackerRef.current = setInterval(() => {
      if (!audio || !audio.duration || isNaN(audio.duration)) return
      const progress = audio.currentTime / audio.duration  // 0..1
      const totalChars = offsets[offsets.length - 1] || 1
      const charPos = progress * totalChars
      // Linear search is fine — sentence counts in practice <50
      let idx = offsets.findIndex(end => charPos < end)
      if (idx < 0) idx = offsets.length - 1
      setActiveSentenceIndex(idx)
    }, 250)
  }

  // Stop on tab hidden / unmount
  useEffect(() => {
    const onHide = () => { if (document.hidden) cleanup() }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const speakBrowser = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
    const clean = prepare(text)
    if (!clean) return false
    window.speechSynthesis.cancel()
    const offsets = computeSentenceOffsets(clean)
    sentenceOffsetsRef.current = offsets
    setActiveText(text)
    setActiveSentenceIndex(offsets.length > 0 ? 0 : -1)

    const u = new SpeechSynthesisUtterance(clean)
    const voice = pickBrowserVoice()
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = 1
    u.onstart = () => { setSpeaking(true); setLoading(false) }
    u.onend = () => { setSpeaking(false); setActiveText(null); setActiveSentenceIndex(-1) }
    u.onerror = () => { setSpeaking(false); setActiveText(null); setActiveSentenceIndex(-1) }
    // Web Speech fires onboundary per word (or sentence on some engines).
    // event.charIndex gives the position in the SOURCE string — we map it
    // to a sentence index using the offsets we precomputed.
    u.onboundary = (e) => {
      if (typeof e.charIndex !== 'number') return
      let idx = offsets.findIndex(end => e.charIndex < end)
      if (idx < 0) idx = offsets.length - 1
      setActiveSentenceIndex(idx)
    }
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
    return true
  }, [rate])

  const speakServer = useCallback(async (text) => {
    const clean = prepare(text)
    if (!clean) return false
    const token = getToken()
    if (!token) return false

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)

    try {
      const resp = await fetch('/api/ai/tts', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
      if (!resp.ok) {
        setLoading(false)
        return false
      }
      const blob = await resp.blob()
      if (ctrl.signal.aborted) return false

      if (audioRef.current) audioRef.current.pause()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audio.playbackRate = rate
      audio.onplaying = () => {
        setSpeaking(true); setLoading(false)
        startTrackerForAudio(audio, clean, text)
      }
      audio.onended = () => {
        setSpeaking(false)
        if (trackerRef.current) { clearInterval(trackerRef.current); trackerRef.current = null }
        setActiveText(null); setActiveSentenceIndex(-1)
      }
      audio.onpause = () => {
        setSpeaking(false)
        if (trackerRef.current) { clearInterval(trackerRef.current); trackerRef.current = null }
      }
      audio.onerror = () => {
        setSpeaking(false); setLoading(false)
        if (trackerRef.current) { clearInterval(trackerRef.current); trackerRef.current = null }
        setActiveText(null); setActiveSentenceIndex(-1)
      }
      audioRef.current = audio
      await audio.play()
      return true
    } catch (err) {
      setLoading(false)
      if (err?.name === 'AbortError') return true
      return false
    }
  }, [rate])

  const speak = useCallback(async (text) => {
    if (!supported || !text) return
    cleanup()
    const ok = await speakServer(text)
    if (!ok) speakBrowser(text)
  }, [supported, speakServer, speakBrowser])

  const stop = useCallback(() => { cleanup() }, [])

  const toggle = useCallback((text) => {
    if (speaking || loading) stop()
    else speak(text)
  }, [speaking, loading, speak, stop])

  const setRate = useCallback((r) => {
    const clamped = Math.max(0.5, Math.min(2, Number(r) || 1))
    setRateState(clamped)
    try { localStorage.setItem(RATE_KEY, String(clamped)) } catch {}
    if (audioRef.current) audioRef.current.playbackRate = clamped
  }, [])

  const value = {
    supported, speaking, loading, speak, stop, toggle, rate, setRate,
    activeText, activeSentenceIndex,
  }
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
