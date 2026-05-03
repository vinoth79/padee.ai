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

  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)
  const utteranceRef = useRef(null)
  const abortRef = useRef(null)

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
    setSpeaking(false)
    setLoading(false)
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
    const u = new SpeechSynthesisUtterance(clean)
    const voice = pickBrowserVoice()
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = 1
    u.onstart = () => { setSpeaking(true); setLoading(false) }
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
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
      audio.onplaying = () => { setSpeaking(true); setLoading(false) }
      audio.onended = () => setSpeaking(false)
      audio.onpause = () => setSpeaking(false)
      audio.onerror = () => { setSpeaking(false); setLoading(false) }
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

  const value = { supported, speaking, loading, speak, stop, toggle, rate, setRate }
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
