// ═══════════════════════════════════════════════════════════════════════════
// VisualExplanationBubble — renders the HTML+SVG returned by /api/ai/visual.
// ═══════════════════════════════════════════════════════════════════════════
// Sandboxed iframe (sandbox="allow-scripts" only — no same-origin, no forms, no
// top-navigation) to prevent the LLM-generated markup from reading cookies or
// making network calls. Auto-sizes to content. Fullscreen modal on Expand click.
//
// Ported from the v3 component; tokens updated to v4 palette, classes unscoped
// so it works inside `.home-v4`.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'

export default function VisualExplanationBubble({ html, loading, error, cached, onRetry }) {
  const [expanded, setExpanded] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(220)
  const iframeRef = useRef(null)

  // Auto-size the iframe to its rendered content
  useEffect(() => {
    if (!html || !iframeRef.current) return
    const iframe = iframeRef.current
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          const h = Math.min(520, Math.max(200, doc.body.scrollHeight + 20))
          setIframeHeight(h)
        }
      } catch {}
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [html])

  if (loading) {
    return (
      <div className="viz-bubble viz-loading">
        <div className="viz-head">
          <span className="viz-dot is-loading" />
          <span className="viz-label">Generating visual…</span>
        </div>
        <div className="viz-skeleton">
          <span /><span /><span />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="viz-bubble viz-error">
        <div className="viz-head">
          <span className="viz-dot is-error" />
          <span className="viz-label">Couldn't generate visual</span>
        </div>
        <p className="viz-error-copy">{error}</p>
        {onRetry && <button className="viz-retry" onClick={onRetry}>Try again ↻</button>}
      </div>
    )
  }

  if (!html) return null

  // Wrap the LLM HTML with defensive CSS so SVG always scales, even when the
  // model forgets width="100%" or sets a fixed pixel size.
  const wrappedHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow:hidden;background:#fff}
body{padding:10px;font-family:'Lexend Deca',-apple-system,system-ui,sans-serif;color:#13131A;font-size:13px;line-height:1.45}
svg{max-width:100%;height:auto;display:block}
img{max-width:100%}
div{max-width:100%}
</style></head><body>${html}</body></html>`

  return (
    <>
      <div className="viz-bubble">
        <div className="viz-head">
          <span className="viz-dot" />
          <span className="viz-label">Visual explanation</span>
          {cached && <span className="viz-cached-chip">Cached ⚡</span>}
          <div className="viz-actions">
            {onRetry && (
              <button className="viz-action" onClick={onRetry} title="Generate a different visual">Regenerate ↻</button>
            )}
            <button className="viz-action" onClick={() => setExpanded(true)} title="Expand to full screen">Expand ⛶</button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={wrappedHtml}
          sandbox="allow-scripts"
          className="viz-iframe"
          style={{ height: iframeHeight }}
          title="Visual explanation"
        />
      </div>

      {expanded && (
        <div className="viz-modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="viz-modal" onClick={e => e.stopPropagation()}>
            <div className="viz-modal-head">
              <span className="viz-label">Visual explanation</span>
              <button className="viz-modal-close" onClick={() => setExpanded(false)}>Close ×</button>
            </div>
            <iframe
              srcDoc={wrappedHtml}
              sandbox="allow-scripts"
              className="viz-iframe viz-iframe-expanded"
              title="Visual explanation (expanded)"
            />
          </div>
        </div>
      )}
    </>
  )
}
