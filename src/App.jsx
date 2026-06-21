import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import { saveToHistory, getHistory } from './db.js'

// ── Inline style tokens ──────────────────────────────────────────
const S = {
  surface:    '#051424',
  surfaceLow: '#0d1c2d',
  surfaceCont:'#122131',
  surfaceHigh:'#1c2b3c',
  surfaceMax: '#273647',
  outline:    '#3b494c',
  outlineMid: '#849396',
  onSurface:  '#d4e4fa',
  onVariant:  '#bac9cc',
  primary:    '#c3f5ff',
  primaryDim: '#00daf3',
  primaryCont:'#00e5ff',
  onPrimary:  '#00363d',
  secondary:  '#bec6e0',
  secCont:    '#3f465c',
  onSec:      '#283044',
  error:      '#ffb4ab',
  errCont:    '#93000a',
  onErr:      '#690005',
  onErrCont:  '#ffdad6',
}

const mono = "'JetBrains Mono', monospace"

// ── Sidebar nav items ─────────────────────────────────────────────
const NAV = [
  { icon: 'analytics',     label: 'Workspace' },
  { icon: 'history',       label: 'History'   },
  { icon: 'electric_meter',label: 'Forensics' },
  { icon: 'settings',      label: 'Settings'  },
]

export default function App() {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [activeNav, setActiveNav] = useState('Workspace')
  const [history, setHistory] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const hist = await getHistory()
      setHistory(hist)
    } catch (e) {
      console.error('Failed to load history', e)
    }
  }

  // ── File handling ─────────────────────────────────────────────
  const processFile = (f) => {
    const isImg   = f.type.startsWith('image/')
    const isVideo = f.type.startsWith('video/') || f.type.startsWith('audio/') || f.name.toLowerCase().endsWith('.mp3')
    if (!isImg && !isVideo) { alert('Please upload an image, video, or audio file.'); return }
    setFile(f); setResult(null); setError(null)
    if (isImg) {
      const r = new FileReader()
      r.onload = e => { setPreview(e.target.result); analyze(f, false) }
      r.readAsDataURL(f)
    } else {
      setPreview(URL.createObjectURL(f)); analyze(f, true)
    }
  }

  const extractFrames = (videoFile, n = 5) => new Promise((res, rej) => {
    const vid = document.createElement('video')
    const url = URL.createObjectURL(videoFile)
    vid.src = url; vid.muted = true; vid.playsInline = true
    vid.onloadedmetadata = async () => {
      const dur = vid.duration
      if (!dur || isNaN(dur)) { URL.revokeObjectURL(url); rej(new Error('Invalid video')); return }
      const canvas = document.createElement('canvas')
      canvas.width = vid.videoWidth || 640; canvas.height = vid.videoHeight || 480
      const ctx = canvas.getContext('2d'), frames = [], step = dur / n
      for (let i = 0; i < n; i++) {
        vid.currentTime = i * step + step / 2
        await new Promise(r => { vid.onseeked = () => { ctx.drawImage(vid,0,0,canvas.width,canvas.height); canvas.toBlob(b => { if(b) frames.push(b); r() }, 'image/jpeg', 0.9) } })
      }
      URL.revokeObjectURL(url); res(frames)
    }
    vid.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Video error')) }
  })

  const analyze = async (f, isVideo) => {
    setLoading(true)
    const fd = new FormData()
    const startTime = performance.now()
    try {
      if (isVideo) {
        const frames = await extractFrames(f, 5)
        frames.forEach((b, i) => fd.append('files', b, `frame_${i}.jpg`))
      } else { fd.append('file', f) }
      
      const r = await fetch('http://localhost:8000/predict', { method: 'POST', body: fd })
      if (!r.ok) throw new Error(`Server error: ${r.status}`)
      const data = await r.json()
      setResult(data)
      
      const endTime = performance.now()
      
      // Save to history
      const predictionStr = (data.prediction || 'UNKNOWN').toUpperCase()
      const isFake = predictionStr === 'FAKE'
      const conf = data.confidence_percent ?? (data.fake_probability != null ? data.fake_probability * 100 : 0)
      
      const record = {
          file: f,
          fileName: f.name,
          timestamp: Date.now(),
          prediction: predictionStr,
          isFake,
          confidence: conf,
          latency: `${Math.round(endTime - startTime)}ms`
      }
      await saveToHistory(record)
      await loadHistory()
    } catch (e) {
      console.error(e)
      setError('Failed to analyze. Ensure backend is running at http://localhost:8000/predict')
    } finally { setLoading(false) }
  }

  const reset = () => {
    if (preview && file && !file.type.startsWith('image/')) URL.revokeObjectURL(preview)
    setFile(null); setPreview(null); setResult(null); setError(null)
    setActiveNav('Workspace')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Confidence calc ───────────────────────────────────────────
  let conf = 0, prediction = 'UNKNOWN', isFake = false
  if (result) {
    prediction = (result.prediction || 'UNKNOWN').toUpperCase()
    isFake = prediction === 'FAKE'
    conf = result.confidence_percent ?? (result.fake_probability != null ? result.fake_probability * 100 : 0)
  }

  // ── Shared style helpers ──────────────────────────────────────
  const glassPanel = { backdropFilter: 'blur(12px)', background: 'rgba(5,20,36,0.7)', border: `1px solid ${S.outline}` }

  return (
    <div style={{ minHeight: '100vh', background: S.surface, color: S.onSurface, fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', left: 0, top: 64, bottom: 0, width: 240,
        background: S.surfaceLow, borderRight: `1px solid ${S.outline}30`,
        display: 'flex', flexDirection: 'column', padding: '24px 12px', zIndex: 40,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${S.primaryCont}18`, border: `1px solid ${S.primaryCont}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: S.primaryCont, fontSize: 18 }}>electric_meter</span>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: S.onSurface }}>Forensic Lab</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: S.outlineMid, marginTop: 2 }}>Node: 712-Alpha</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ icon, label }) => {
            const active = activeNav === label
            return (
              <button key={label} onClick={() => setActiveNav(label)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active ? S.secCont : 'transparent',
                color: active ? S.onVariant : S.onVariant,
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = S.surfaceMax }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? S.primaryCont : S.outlineMid }}>{icon}</span>
                <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.04em', fontWeight: active ? 700 : 400 }}>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* New Analysis btn */}
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: S.primary, color: S.onPrimary, fontFamily: mono, fontSize: 12, fontWeight: 700,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
          New Analysis
        </button>
      </aside>

      {/* ── Main area ── */}
      <main style={{ marginLeft: 240, paddingTop: 64, minHeight: '100vh' }} className="grid-bg">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          {/* ── Left: Main Area ── */}
          <section>
            {activeNav === 'Workspace' && (
                <>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 700, color: S.primaryDim, letterSpacing: '-0.01em' }}>Analysis Workspace</h1>
                        <p style={{ fontFamily: mono, fontSize: 11, color: S.outlineMid, marginTop: 4 }}>v2.4.0 Forensic Engine Enabled</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 6, background: S.surfaceHigh, border: `1px solid ${S.outline}50` }}>
                        <div className="status-dot" />
                        <span style={{ fontFamily: mono, fontSize: 11, color: S.onSurface }}>System Live</span>
                    </div>
                    </div>

                    {/* ── Drop Zone ── */}
                    {!file && !loading && !result && (
                    <div
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }}
                        style={{
                        ...glassPanel,
                        position: 'relative', borderRadius: 12, height: 420,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', overflow: 'hidden',
                        borderStyle: 'dashed', borderWidth: 2,
                        borderColor: dragOver ? S.primaryCont : S.outline,
                        background: dragOver ? `rgba(0,229,255,0.04)` : 'rgba(5,20,36,0.7)',
                        transition: 'all 0.3s',
                        }}
                    >
                        <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*,.mp3" onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]) }} />
                        <div className="scanning-line" />

                        {/* Icon */}
                        <div className="forensic-glow" style={{ width: 72, height: 72, borderRadius: '50%', background: S.surfaceMax, border: `1px solid ${S.outline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 36, color: S.primaryCont }}>upload_file</span>
                        </div>
                        <h2 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 600, color: S.onSurface, marginBottom: 8 }}>Initialize Forensic Scan</h2>
                        <p style={{ fontFamily: 'Inter', fontSize: 14, color: S.onVariant, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
                        Drag and drop high-resolution video, image, or audio assets for deep-layer neural network analysis.
                        </p>

                        {/* Format tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28, justifyContent: 'center' }}>
                        {[['video_file','MP4 / MOV'],['image','JPG / PNG'],['audio_file','MP3 / WAV'],['settings_ethernet','METADATA']].map(([icon,label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#010f1f', border: `1px solid ${S.outline}50`, borderRadius: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: S.primary }}>{icon}</span>
                            <span style={{ fontFamily: mono, fontSize: 11, color: S.primary }}>{label}</span>
                            </div>
                        ))}
                        </div>

                        {/* HUD overlays */}
                        <div style={{ position: 'absolute', top: 12, left: 14, fontFamily: mono, fontSize: 10, color: `${S.outlineMid}60` }}>COORD_X: 42.12 | COORD_Y: 89.02</div>
                        <div style={{ position: 'absolute', bottom: 12, right: 14, fontFamily: mono, fontSize: 10, color: `${S.outlineMid}60` }}>ENCRYPTION: AES-256</div>
                    </div>
                    )}

                    {/* ── Loading ── */}
                    {loading && (
                    <div style={{ ...glassPanel, borderRadius: 12, height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
                        <div className="scanning-line" />
                        <div style={{ width: 72, height: 72, borderRadius: '50%', border: `2px solid ${S.outline}`, borderTop: `2px solid ${S.primaryCont}` }} className="spinner" />
                        <p style={{ fontFamily: mono, fontSize: 13, color: S.primaryDim }}>Analyzing file...</p>
                        <p style={{ fontFamily: mono, fontSize: 11, color: S.outlineMid }}>Deep-layer neural scan in progress</p>
                    </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                    <div style={{ ...glassPanel, borderRadius: 12, padding: 24, borderColor: S.errCont, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span className="material-symbols-outlined" style={{ color: S.error }}>error</span>
                        <span style={{ fontFamily: mono, fontSize: 12, color: S.error }}>SCAN FAILED</span>
                        </div>
                        <p style={{ fontFamily: 'Inter', fontSize: 14, color: S.onErrCont, marginBottom: 16 }}>{error}</p>
                        <button onClick={reset} style={{ padding: '8px 16px', background: `${S.errCont}90`, border: `1px solid ${S.error}40`, borderRadius: 6, color: S.error, fontFamily: mono, fontSize: 12, cursor: 'pointer' }}>Retry</button>
                    </div>
                    )}

                    {/* ── Result ── */}
                    {result && !loading && (
                    <div style={{ ...glassPanel, borderRadius: 12, overflow: 'hidden' }}>
                        {/* Preview */}
                        {preview && (
                        <div style={{ width: '100%', height: 260, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${S.outline}` }}>
                            {file?.type.startsWith('image/')
                            ? <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            : <video src={preview} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />}
                        </div>
                        )}
                        {/* Result info */}
                        <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 600 }}>Analysis Complete</h2>
                            <div style={{ padding: '6px 14px', borderRadius: 6, fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', background: isFake ? `${S.errCont}80` : '#00229980', color: isFake ? S.onErrCont : S.primaryCont, border: `1px solid ${isFake ? S.error : S.primaryCont}40` }}>
                            {prediction}
                            </div>
                        </div>
                        {/* Confidence bar */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontFamily: mono, fontSize: 11, color: S.onVariant }}>Confidence Score</span>
                            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: isFake ? S.error : S.primaryCont }}>{conf.toFixed(2)}%</span>
                            </div>
                            <div style={{ height: 4, background: S.surfaceMax, borderRadius: 99, overflow: 'hidden' }}>
                            <div className="conf-bar" style={{ height: '100%', width: `${conf}%`, background: isFake ? '#ff4444' : S.primaryCont, borderRadius: 99 }} />
                            </div>
                        </div>
                        <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: S.surfaceMax, border: `1px solid ${S.outline}`, borderRadius: 8, color: S.onSurface, fontFamily: mono, fontSize: 12, cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = S.surfaceBright}
                            onMouseLeave={e => e.currentTarget.style.background = S.surfaceMax}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                            Analyze Another File
                        </button>
                        </div>
                    </div>
                    )}

                    {/* ── Capability cards ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
                    {[
                        { icon: 'troubleshoot', title: 'Consistency Check', desc: 'Analyzes lighting vectors and facial shadows for geometric anomalies.' },
                        { icon: 'pattern', title: 'Frequency Domain', desc: 'Detects GAN-specific noise patterns in the high-frequency spectrum.' },
                        { icon: 'neurology', title: 'Artifact Mapping', desc: 'Identifies compression artifacts and neural-rendering "ghosts".' },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} style={{ ...glassPanel, borderRadius: 8, padding: 16 }}>
                        <span className="material-symbols-outlined" style={{ color: S.primary, fontSize: 22, marginBottom: 10, display: 'block' }}>{icon}</span>
                        <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: S.onSurface, marginBottom: 6 }}>{title}</div>
                        <p style={{ fontFamily: 'Inter', fontSize: 11, color: S.onVariant, lineHeight: 1.6 }}>{desc}</p>
                        </div>
                    ))}
                    </div>
                </>
            )}

            {activeNav === 'History' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 700, color: S.primaryDim, letterSpacing: '-0.01em' }}>Scan History</h1>
                            <p style={{ fontFamily: mono, fontSize: 11, color: S.outlineMid, marginTop: 4 }}>Previously analyzed items saved locally</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                        {history.length === 0 ? (
                            <div style={{ ...glassPanel, padding: 48, gridColumn: '1 / -1', textAlign: 'center', borderRadius: 12 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 48, color: S.outlineMid, marginBottom: 16 }}>history</span>
                                <div style={{ fontFamily: mono, fontSize: 14, color: S.onSurface }}>No history yet</div>
                                <div style={{ fontFamily: mono, fontSize: 11, color: S.outlineMid, marginTop: 8 }}>Scanned files will appear here automatically.</div>
                            </div>
                        ) : history.map(item => {
                            const isImg = item.file.type.startsWith('image/');
                            let url = '';
                            try {
                                url = URL.createObjectURL(item.file);
                            } catch (e) {
                                console.error('Failed to create URL for history item', e);
                            }
                            return (
                                <div key={item.id} style={{ ...glassPanel, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: 160, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        {isImg ? 
                                            <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 
                                            <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                        }
                                        <div style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 4, fontFamily: mono, fontSize: 9, background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(255,255,255,0.2)` }}>
                                            {isImg ? 'IMAGE' : 'VIDEO'}
                                        </div>
                                    </div>
                                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: S.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 12 }} title={item.fileName}>
                                            {item.fileName}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontFamily: mono, fontSize: 10, padding: '4px 8px', borderRadius: 4, background: item.isFake ? `${S.errCont}80` : '#00229980', color: item.isFake ? S.onErrCont : S.primaryCont, border: `1px solid ${item.isFake ? S.error : S.primaryCont}40` }}>
                                                {item.prediction}
                                            </span>
                                            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: item.isFake ? S.error : S.primaryCont }}>
                                                {item.confidence.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${S.outline}30`, fontFamily: mono, fontSize: 9, color: S.outlineMid, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                            <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
          </section>

          {/* ── Right: Activity panel ── */}
          <section>
            <div style={{ ...glassPanel, borderRadius: 12, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.outline}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: S.primary }}>quick_reference_all</span>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: S.onSurface }}>RECENT ACTIVITY</span>
                </div>
                <button onClick={() => setActiveNav('History')} style={{ fontFamily: mono, fontSize: 11, color: S.primaryDim, background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
              </div>

              {/* Activity list */}
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: S.outlineMid, marginBottom: 8 }}>inbox</span>
                        <div style={{ fontFamily: mono, fontSize: 10, color: S.outlineMid }}>No recent activity</div>
                    </div>
                ) : history.slice(0, 4).map((item) => {
                    const statusColor = item.isFake ? S.errCont : '#00e5ff22';
                    const iconColor = item.isFake ? S.error : S.primaryCont;
                    const tagBg = item.isFake ? S.errCont : S.surfaceMax;
                    const tagColor = item.isFake ? S.onErrCont : S.primaryCont;
                    
                    return (
                        <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setActiveNav('History')}>
                            <div style={{ width: 56, height: 56, borderRadius: 6, flexShrink: 0, background: statusColor, border: `1px solid ${S.outline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor }}>{item.file.type.startsWith('image/') ? 'image' : 'video_file'}</span>
                            <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontFamily: mono, fontSize: 8, fontWeight: 700, color: S.onSurface, whiteSpace: 'nowrap', textShadow: '0 1px 2px #000' }}>
                                {item.isFake ? 'FAILED' : 'PASS'}
                            </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: S.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</div>
                            <div style={{ fontFamily: mono, fontSize: 10, color: S.outlineMid, marginTop: 3 }}>LATENCY: {item.latency} | GEN_PROB: {item.confidence.toFixed(1)}%</div>
                            <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', background: tagBg, color: tagColor, fontFamily: mono, fontSize: 9, borderRadius: 4 }}>
                                {item.isFake ? 'SYNTHETIC_SIGNAL' : 'AUTHENTIC'}
                            </span>
                            </div>
                        </div>
                    )
                })}
              </div>

              {/* Throughput box */}
              <div style={{ margin: '0 16px 16px', padding: 14, background: S.surfaceLow, border: `1px solid ${S.outline}30`, borderRadius: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: S.outlineMid, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Node Throughput</div>
                {[
                  { label: 'CPU Load',     val: '34%', pct: 34, color: S.primaryCont },
                  { label: 'Neural Cache', val: '89%', pct: 89, color: S.secondary    },
                  { label: 'Scans Today', val: history.length.toString(),  pct: Math.min(100, (history.length / 50) * 100), color: S.primaryCont },
                ].map(({ label, val, pct, color }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: mono, fontSize: 10, color: S.onVariant }}>{label}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color }}>{val}</span>
                    </div>
                    <div style={{ height: 3, background: S.surfaceMax, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 1s ease-out' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ marginLeft: 240, background: '#010f1f', borderTop: `1px solid ${S.outline}20`, padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: S.onSurface }}>SAJAK_AI</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: S.outlineMid, marginTop: 4 }}>© 2024 SAJAK_AI. Forensic Grade Authentication.</div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Security Certs', 'Privacy Policy', 'Company', 'Terms of Service'].map(l => (
              <a key={l} href="#" style={{ fontFamily: mono, fontSize: 11, color: S.onVariant, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = S.primary}
                onMouseLeave={e => e.target.style.color = S.onVariant}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
