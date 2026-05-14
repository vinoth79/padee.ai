// PaBubble — AI response rendered with Pa mascot on the left and
// paper-background conversational text (NO card). Includes action chips,
// NCERT citation, and feedback icons.
import PaMascot from '../home-v4/PaMascot'
import FeedbackIcons from './FeedbackIcons'
import ListenButton from '../ui/ListenButton'
import MathText from '../ui/MathText'
import VisualExplanationBubble from './VisualExplanationBubble'
import InlineQuiz from './InlineQuiz'
import ChallengeView from './ChallengeView'
import { useUser } from '../../context/UserContext'

// Action chips. Labels are always English — easier for the student to scan
// among Hindi response text, less context-switching for parents observing,
// and avoids the LLM-produced "looks-Hindi-but-isn't-quite-right" register
// debates.
//
// Visibility flags:
//   hiOnly: true  — only show when tutor_language='hi'
//   enOnly: true  — only show when tutor_language='en'
// Chips with neither flag show in both modes.
//
// Why hide `visual` + `challenge` in Hindi mode:
//   • Hindi mode is typically used for literature/poetry questions (Sprint 3
//     / F6b Hindi-as-a-subject path). A diagram doesn't illustrate a poem,
//     and "harder problem with given values" doesn't fit literary analysis.
//   • For Hindi-mode students asking Maths/Sci questions, we lose those two
//     chips — acceptable trade-off; they can switch to English mode for that
//     use case. Better than cluttering the literature view with unusable
//     options.
const CHIPS = [
  { key: 'visual',      label: 'Explain visually ✨', enOnly: true },
  { key: 'simpler',     label: 'Simpler please' },
  { key: 'exam',        label: 'Show exam answer' },
  { key: 'quiz',        label: 'Quiz me on this' },
  { key: 'similar',     label: 'Similar question' },
  { key: 'challenge',   label: 'Challenge me', enOnly: true },
  { key: 'reallife',    label: 'Real-life example' },
  { key: 'mistakes',    label: 'Common mistakes' },
  // Sprint 3 / F6a — Hindi-mode-only helper. Re-emits the previous Pa
  // response in English while preserving math + code. Useful for parents
  // reviewing a kid's session or students cross-checking technical terms.
  { key: 'translate-en', label: 'English translation', hiOnly: true },
]

export default function PaBubble({
  msg,
  onChip,
  onCloseQuiz,        // dismisses inline quiz (parent clears msg.showQuiz)
  onFeedback,
  onReport,
  onCopy,
  copied,
  showCopy = true,
  className: studentClass,  // Class level for the quiz API call
}) {
  const isStreaming = msg.streaming
  const isError = msg.error
  // F6a — chip labels stay English regardless of tutor_language. We only
  // filter the chip *list* by language: hiOnly chips (e.g.
  // "English translation") only appear in Hindi mode; enOnly chips (e.g.
  // "Explain visually", "Challenge me") only in English mode.
  const { tutorLanguage } = useUser()
  const isHindi = tutorLanguage === 'hi'
  const visibleChips = CHIPS.filter(c => {
    if (c.hiOnly && !isHindi) return false
    if (c.enOnly && isHindi) return false
    return true
  })
  // F6b — bilingual responses. When subject=Hindi + tutor_language=hi, the
  // backend emits the response in two halves separated by ___HINDI___ /
  // ___ENGLISH___ markers. We detect that here and render two side-by-side
  // columns. Karaoke + TTS only run on the Hindi half; the English column
  // is reference for non-Hindi-speaking classmates.
  const bilingual = !isStreaming && parseBilingual(msg.text || '')

  return (
    <div className="pa-bubble">
      <div className="pa-avatar">
        <PaMascot
          size={32}
          mood={isStreaming ? 'thinking' : 'speaking'}
          syncWithSpeech
        />
      </div>
      <div className="pa-content">
        {/* Response text — MathText renders LaTeX after stream completes.
            During streaming we show plain text (Q1=a) to avoid mid-stream
            half-rendered math. Challenge messages get a special view that
            gates the solution behind a "Show solution" button.
            Bilingual responses render in a 2-column grid (Hindi | English). */}
        <div>
          {msg.isChallenge && !isStreaming ? (
            <ChallengeView text={msg.text || ''} />
          ) : bilingual ? (
            <BilingualInline hi={bilingual.hi} en={bilingual.en} />
          ) : (
            <MathText text={msg.text || ''} streaming={isStreaming} />
          )}
          {isStreaming && <span className="streaming-cursor" />}
        </div>

        {/* Visual explanation — appears inline under the response text */}
        {(msg.visualLoading || msg.visualHtml || msg.visualError) && (
          <VisualExplanationBubble
            html={msg.visualHtml}
            loading={msg.visualLoading}
            error={msg.visualError}
            cached={msg.visualCached}
            onRetry={() => onChip?.('visual:force')}
          />
        )}

        {/* Inline quiz widget — toggled by the Quiz Me chip */}
        {msg.showQuiz && !isStreaming && (
          <InlineQuiz
            context={msg.text}
            subject={msg.subject || 'Physics'}
            className={studentClass || 10}
            onClose={() => onCloseQuiz?.(msg.id)}
          />
        )}

        {/* Action chips — only on completed non-error responses */}
        {!isStreaming && !isError && msg.text && (
          <div className="chip-row">
            {visibleChips.map(c => (
              <button key={c.key} className="chip" onClick={() => onChip?.(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Meta row: NCERT citation + feedback icons + copy */}
        {!isStreaming && !isError && msg.text && (
          <div className="pa-meta">
            {msg.ncertSource ? (
              <span className="ncert-chip">📖 {msg.ncertSource}</span>
            ) : <span />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* For bilingual responses, only read the Hindi half aloud —
                  it's the primary content; English is the parallel reference
                  for non-Hindi-speaking classmates. */}
              <ListenButton text={bilingual ? bilingual.hi : msg.text} title="Read this answer aloud" />
              {showCopy && (
                <button
                  onClick={() => onCopy?.(msg.id, msg.text)}
                  className="feedback-btn"
                  title="Copy answer"
                  aria-label="Copy">
                  <svg className="ico" width="15" height="15" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              {copied && <span style={{ fontSize: 11, color: 'var(--c-green)' }}>Copied</span>}
              {msg.sessionId && (
                <FeedbackIcons
                  msgId={msg.id}
                  feedback={msg._feedback}
                  onFeedback={onFeedback}
                  onReport={onReport}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Exposed so the parent screen can reuse the same chip list when deciding
// prompts (the parent handles the actual LLM call — this component just tells
// it which key was clicked).
export { CHIPS }

// Sprint 3 / F6b — inline bilingual layout. Each Hindi paragraph followed
// immediately by its English translation (one stanza). Replaces the
// earlier side-by-side two-column layout — easier to follow line-by-line,
// works better on phones, no need to scan horizontally between languages.
//
// Pairing strategy: split both halves on blank-line paragraph breaks. The
// LLM is prompted to keep paragraphs mirrored, so para N on each side
// pairs up cleanly. If counts diverge (rare — LLM dropped or merged a
// para), we render unmatched paragraphs at the end labelled-as-such so
// nothing is lost.
//
// Karaoke + TTS only run on the Hindi paragraphs (each is a separate
// MathText that reads its own text identity). The English paragraphs are
// reference scaffolding for non-Hindi-speaking classmates.
function BilingualInline({ hi, en }) {
  const hiParas = splitParagraphs(hi)
  const enParas = splitParagraphs(en)
  const n = Math.min(hiParas.length, enParas.length)
  // F6b — precompute each Hindi paragraph's word offset within the FULL hi
  // text. The ListenButton speaks `hi` (the full half), so SpeechContext's
  // activeWordIndex is global to that string. Each paragraph's MathText
  // needs its starting word offset so it can translate global → local.
  //
  // Word counts here are computed over the source paragraph (same definition
  // as MathText / SpeechContext: \S+ runs). Approximation note: the actual
  // spoken text goes through prepare() (latexToSpeech etc.) which can drop
  // or alter tokens — for plain Hindi prose without LaTeX (typical for F6b
  // literature responses) the counts align exactly.
  const wordOffsets = []
  let running = 0
  for (let i = 0; i < n; i++) {
    wordOffsets.push(running)
    const count = (hiParas[i].match(/\S+/g) || []).length
    // +1 because paragraph joins (blank line between them) don't insert a
    // visible word in source text, so subsequent paragraphs start exactly
    // at `running + count` in the tokenized stream. No padding needed.
    running += count
  }

  return (
    <div className="bilingual-inline">
      {hiParas.slice(0, n).map((hiPara, i) => (
        <div key={i} className="bilingual-stanza">
          <div className="bilingual-stanza-hi">
            {/* parentText = full Hindi half → karaoke highlight tracks the
                global TTS playhead. wordOffset = words preceding this para. */}
            <MathText text={hiPara} parentText={hi} wordOffset={wordOffsets[i]} />
          </div>
          <div className="bilingual-stanza-en">
            {/* English column is reference only — no karaoke needed */}
            <MathText text={enParas[i]} />
          </div>
        </div>
      ))}
      {hiParas.length > n && (
        <div className="bilingual-stanza bilingual-stanza-orphan">
          <div className="bilingual-stanza-hi">
            {hiParas.slice(n).map((p, i) => (
              <MathText key={i} text={p} parentText={hi} wordOffset={wordOffsets[n - 1] || 0} />
            ))}
          </div>
        </div>
      )}
      {enParas.length > n && (
        <div className="bilingual-stanza bilingual-stanza-orphan">
          <div className="bilingual-stanza-en">{enParas.slice(n).map((p, i) => <MathText key={i} text={p} />)}</div>
        </div>
      )}
    </div>
  )
}

function splitParagraphs(text) {
  if (!text) return []
  // Split on blank lines (one or more newlines, with optional whitespace).
  // Keep meaningful content only.
  return text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0)
}

// Sprint 3 / F6b — parse a bilingual response. The backend emits Hindi-as-a-
// subject responses in the form:
//
//   ___HINDI___
//   <Hindi explanation>
//   ___ENGLISH___
//   <English explanation>
//
// Returns null when the response is NOT bilingual (no markers, or only one
// marker present — fall back to single-column rendering).
function parseBilingual(text) {
  if (!text) return null
  // Tolerate slight LLM drift: allow optional whitespace around markers,
  // accept either "___HINDI___" or "###HINDI###".
  const hiMarker = /(?:^|\n)\s*(?:___|###)\s*HINDI\s*(?:___|###)\s*\n?/i
  const enMarker = /(?:^|\n)\s*(?:___|###)\s*ENGLISH\s*(?:___|###)\s*\n?/i
  const hi = text.match(hiMarker)
  const en = text.match(enMarker)
  if (!hi || !en || en.index <= hi.index) return null
  const hiText = text.slice(hi.index + hi[0].length, en.index).trim()
  const enText = text.slice(en.index + en[0].length).trim()
  if (!hiText || !enText) return null
  return { hi: hiText, en: enText }
}
