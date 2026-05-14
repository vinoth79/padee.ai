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
  // being spoken; activeSentenceIndex + activeWordIndex are 0-based indices
  // into the sentence/word arrays for that string. Components that render
  // the same text can compare activeText === msg.text and highlight the
  // matching span.
  activeText: null, activeSentenceIndex: -1, activeWordIndex: -1,
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

// Word-level tokenisation for karaoke highlight. Each token carries its
// {text, isWord, start, end} so the renderer can mark the active word while
// keeping whitespace/punctuation as inline filler.
//
// Hindi works the same way: whitespace separates words in Devanagari just
// like Latin. Punctuation like `।` `,` `.` attaches to the preceding word
// here (we strip surrounding whitespace into separate tokens), which
// matches how a reader visually sees "word ending".
//
// Exported so MathText and the tracker stay aligned on token indices.
export function tokenizeWords(text) {
  if (!text) return []
  const tokens = []
  // \S+ = non-whitespace run (a "word" — including attached punctuation)
  // \s+ = whitespace run (one inter-word gap)
  const re = /\S+|\s+/g
  let m
  while ((m = re.exec(text)) !== null) {
    const isWord = !/^\s+$/.test(m[0])
    tokens.push({
      text: m[0],
      isWord,
      start: m.index,
      end: m.index + m[0].length,
    })
  }
  return tokens
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
  // F6a — karaoke highlight state (both sentence + word indices)
  const [activeText, setActiveText] = useState(null)
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)

  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)
  const utteranceRef = useRef(null)
  const abortRef = useRef(null)
  const trackerRef = useRef(null)        // setInterval handle for the karaoke tick
  const sentenceOffsetsRef = useRef([])  // cumulative char offsets per sentence end
  const wordEndsRef = useRef([])         // end-offsets for each WORD token (skips whitespace)

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
    wordEndsRef.current = []
    setSpeaking(false)
    setLoading(false)
    setActiveText(null)
    setActiveSentenceIndex(-1)
    setActiveWordIndex(-1)
  }

  // Compute cumulative end-offsets for each sentence in `prepared` (the text
  // that's actually being read aloud — post-prepare() so it matches what TTS
  // gets). offsets[i] = end-position in `prepared` of sentence i.
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

  // Compute end-offsets for each WORD (skips whitespace) in `prepared`.
  // The renderer (MathText) builds the same token list against the SOURCE
  // text — for the highlight to align, both sides use tokenizeWords() and
  // the same whitespace filter.
  function computeWordEnds(prepared) {
    return tokenizeWords(prepared)
      .filter(t => t.isWord)
      .map(t => t.end)
  }

  // Karaoke tick — runs every 80ms while audio plays so word-level
  // highlights look smooth. For the server backend we estimate progress
  // from audio.currentTime / audio.duration; for the browser backend we
  // use onBoundary events directly (more precise).
  function startTrackerForAudio(audio, prepared, sourceText) {
    const sentEnds = computeSentenceOffsets(prepared)
    const wordEnds = computeWordEnds(prepared)
    sentenceOffsetsRef.current = sentEnds
    wordEndsRef.current = wordEnds
    setActiveText(sourceText)
    setActiveSentenceIndex(sentEnds.length > 0 ? 0 : -1)
    setActiveWordIndex(wordEnds.length > 0 ? 0 : -1)
    if (trackerRef.current) clearInterval(trackerRef.current)
    trackerRef.current = setInterval(() => {
      if (!audio || !audio.duration || isNaN(audio.duration)) return
      const progress = audio.currentTime / audio.duration  // 0..1
      // Sentence index
      if (sentEnds.length > 0) {
        const totalChars = sentEnds[sentEnds.length - 1] || 1
        const charPos = progress * totalChars
        let sIdx = sentEnds.findIndex(end => charPos < end)
        if (sIdx < 0) sIdx = sentEnds.length - 1
        setActiveSentenceIndex(sIdx)
      }
      // Word index — use the same charPos scale (sentence ends and word
      // ends both measured against `prepared`).
      if (wordEnds.length > 0) {
        const totalChars = wordEnds[wordEnds.length - 1] || 1
        const charPos = progress * totalChars
        let wIdx = wordEnds.findIndex(end => charPos < end)
        if (wIdx < 0) wIdx = wordEnds.length - 1
        setActiveWordIndex(wIdx)
      }
    }, 80)
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
    const sentEnds = computeSentenceOffsets(clean)
    const wordEnds = computeWordEnds(clean)
    sentenceOffsetsRef.current = sentEnds
    wordEndsRef.current = wordEnds
    setActiveText(text)
    setActiveSentenceIndex(sentEnds.length > 0 ? 0 : -1)
    setActiveWordIndex(wordEnds.length > 0 ? 0 : -1)

    const u = new SpeechSynthesisUtterance(clean)
    const voice = pickBrowserVoice()
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = 1
    u.onstart = () => { setSpeaking(true); setLoading(false) }
    u.onend = () => {
      setSpeaking(false)
      setActiveText(null); setActiveSentenceIndex(-1); setActiveWordIndex(-1)
    }
    u.onerror = () => {
      setSpeaking(false)
      setActiveText(null); setActiveSentenceIndex(-1); setActiveWordIndex(-1)
    }
    // Web Speech onboundary fires per word (charIndex in the source string).
    // Some engines also fire per sentence (e.name === 'sentence'). We update
    // both indices so highlighting stays accurate even without the tick.
    u.onboundary = (e) => {
      if (typeof e.charIndex !== 'number') return
      let sIdx = sentEnds.findIndex(end => e.charIndex < end)
      if (sIdx < 0) sIdx = sentEnds.length - 1
      setActiveSentenceIndex(sIdx)
      let wIdx = wordEnds.findIndex(end => e.charIndex < end)
      if (wIdx < 0) wIdx = wordEnds.length - 1
      setActiveWordIndex(wIdx)
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
        setActiveText(null); setActiveSentenceIndex(-1); setActiveWordIndex(-1)
      }
      audio.onpause = () => {
        setSpeaking(false)
        if (trackerRef.current) { clearInterval(trackerRef.current); trackerRef.current = null }
      }
      audio.onerror = () => {
        setSpeaking(false); setLoading(false)
        if (trackerRef.current) { clearInterval(trackerRef.current); trackerRef.current = null }
        setActiveText(null); setActiveSentenceIndex(-1); setActiveWordIndex(-1)
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
    activeText, activeSentenceIndex, activeWordIndex,
  }
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
