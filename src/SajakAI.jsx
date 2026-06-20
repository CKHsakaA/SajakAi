import { useState, useRef, useCallback } from "react";

// ─── Inline styles (no Tailwind / CSS modules needed) ───────────────────────

const styles = {
  // ── Reset / base ──
  "*": { boxSizing: "border-box", margin: 0, padding: 0 },

  // ── Tokens ──
  colors: {
    bg: "#0d0d0d",
    surface: "#141414",
    surfaceHover: "#1a1a1a",
    border: "rgba(255,255,255,0.08)",
    borderHover: "rgba(255,255,255,0.18)",
    text: "#f0f0f0",
    muted: "#888",
    faint: "#555",
    accent: "#00e5b4",      // teal — "scan" energy
    accentDim: "#00e5b420",
    danger: "#ff4d4d",
    dangerDim: "#ff4d4d20",
    safe: "#00e5b4",
    safeDim: "#00e5b420",
  },
};

const C = styles.colors;

// ─── Small reusable style objects ────────────────────────────────────────────

const card = {
  background: C.surface,
  border: `0.5px solid ${C.border}`,
  borderRadius: 16,
  padding: "20px 24px",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated scan-line overlay shown while processing */
function ScanOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      borderRadius: 16,
      background: "rgba(13,13,13,0.88)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 20, zIndex: 10,
    }}>
      {/* Animated scanner beam */}
      <div style={{ width: "72%", position: "relative", height: 120 }}>
        <div style={{
          width: "100%", height: 2,
          background: C.accent,
          boxShadow: `0 0 12px ${C.accent}`,
          position: "absolute",
          animation: "scanBeam 1.4s ease-in-out infinite",
        }} />
        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderTop: `2px solid ${C.accent}`, borderLeft: `2px solid ${C.accent}` },
          { top: 0, right: 0, borderTop: `2px solid ${C.accent}`, borderRight: `2px solid ${C.accent}` },
          { bottom: 0, left: 0, borderBottom: `2px solid ${C.accent}`, borderLeft: `2px solid ${C.accent}` },
          { bottom: 0, right: 0, borderBottom: `2px solid ${C.accent}`, borderRight: `2px solid ${C.accent}` },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute", width: 16, height: 16,
            ...s,
          }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: C.muted, letterSpacing: "0.08em" }}>
        Analyzing…
      </p>

      {/* Keyframe injection */}
      <style>{`
        @keyframes scanBeam {
          0%   { top: 0;    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillBar {
          from { width: 0%; }
        }
      `}</style>
    </div>
  );
}


/** Result section shown after scan */
function ResultCard({ result }) {
  const isFake = result.verdict === "fake";

  const accentColor = isFake ? C.danger : C.safe;
  const accentDim   = isFake ? C.dangerDim : C.safeDim;

  return (
    <div style={{
      ...card,
      animation: "fadeUp 0.35s ease both",
      borderColor: accentColor + "44",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accentDim,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: accentColor,
        }}>
          {isFake ? "⚠" : "✓"}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, color: C.text }}>
            {isFake ? "Deepfake detected" : "Likely authentic"}
          </p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {isFake
              ? "This media shows signs of synthetic manipulation."
              : "No significant manipulation markers found."}
          </p>
        </div>
        {/* Confidence pill */}
        <div style={{
          marginLeft: "auto",
          padding: "4px 12px", borderRadius: 999,
          background: accentDim,
          border: `0.5px solid ${accentColor}44`,
          fontSize: 13, fontWeight: 500, color: accentColor,
        }}>
          {result.confidence}% confidence
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          height: 4, borderRadius: 999,
          background: C.border, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${result.confidence}%`,
            background: accentColor,
            borderRadius: 999,
            animation: "fillBar 0.8s cubic-bezier(.4,0,.2,1) both",
          }} />
        </div>
      </div>

      {/* Stat grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}>
        {result.stats.map(({ label, value, flag }) => (
          <div key={label} style={{
            background: C.bg,
            border: `0.5px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
          }}>
            <p style={{ fontSize: 11, color: C.faint, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </p>
            <p style={{
              fontSize: 14, fontWeight: 500,
              color: flag ? C.danger : C.safe,
            }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

export default function SajakAI() {
  const [file, setFile]           = useState(null);     // File object
  const [preview, setPreview]     = useState(null);     // Object URL for images
  const [isDragOver, setDragOver] = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [result, setResult]       = useState(null);

  // Nav hover states
  const [hoverAbout, setHoverAbout]     = useState(false);
  const [hoverContact, setHoverContact] = useState(false);

  // Drop zone hover (when no file)
  const [hoverDrop, setHoverDrop] = useState(false);

  // Scan button hover
  const [hoverScan, setHoverScan] = useState(false);

  const fileInputRef = useRef(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((incoming) => {
    if (!incoming) return;
    setFile(incoming);
    setResult(null);
    if (incoming.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(incoming));
    } else {
      setPreview(null); // video — no preview thumbnail
    }
  }, []);

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true);  };
  const onDragLeave = ()    => setDragOver(false);

  const onInputChange = (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  };

  // ── Scan (mock — replace body with real API call) ──────────────────────────

  const runScan = () => {
    if (!file || scanning) return;
    setScanning(true);
    setResult(null);

    // TODO: replace this timeout with your actual API call:
    //   const formData = new FormData();
    //   formData.append("file", file);
    //   const res = await fetch("/api/detect", { method: "POST", body: formData });
    //   const data = await res.json();
    //   setResult(data);

    setTimeout(() => {
      const isFake    = Math.random() > 0.5;
      const confidence = isFake
        ? 72 + Math.floor(Math.random() * 22)
        : 80 + Math.floor(Math.random() * 18);

      setResult({
        verdict: isFake ? "fake" : "real",
        confidence,
        stats: [
          { label: "Facial inconsistencies", value: isFake ? "Detected"   : "None",       flag: isFake },
          { label: "Compression artifacts",  value: isFake ? "High"        : "Normal",     flag: isFake },
          { label: "Texture anomalies",      value: isFake ? "Irregular"   : "Consistent", flag: isFake },
          { label: "Metadata integrity",     value: isFake ? "Modified"    : "Intact",     flag: isFake },
        ],
      });
      setScanning(false);
    }, 2600);
  };

  // ── Drop zone appearance ───────────────────────────────────────────────────

  const dropBorderColor = isDragOver
    ? C.accent
    : (file ? C.borderHover : (hoverDrop ? C.borderHover : C.border));

  const dropBg = isDragOver
    ? C.accentDim
    : C.surface;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 60,
        background: C.bg,
        borderBottom: `0.5px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: C.accentDim,
            border: `0.5px solid ${C.accent}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: C.accent,
          }}>
            ◎
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Sajak<span style={{ color: C.accent }}>AI</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "About us",    hover: hoverAbout,   setHover: setHoverAbout   },
            { label: "Contact us",  hover: hoverContact, setHover: setHoverContact },
          ].map(({ label, hover, setHover }) => (
            <button
              key={label}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: hover ? C.surfaceHover : "transparent",
                border: `0.5px solid ${hover ? C.border : "transparent"}`,
                fontSize: 13, color: hover ? C.text : C.muted,
                cursor: "pointer",
                transition: "all 0.18s ease",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "3.5rem 1.5rem 4rem" }}>

        {/* Hero text */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          {/* Small badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 999,
            background: C.surface,
            border: `0.5px solid ${C.border}`,
            fontSize: 12, color: C.muted,
            marginBottom: "1.25rem",
          }}>
            <span style={{ fontSize: 10, color: C.accent }}>●</span>
            AI-powered deepfake detection
          </div>

          <h1 style={{
            fontSize: 32, fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.2, marginBottom: "0.75rem",
          }}>
            Is this real?<br />
            <span style={{ color: C.accent }}>Let us find out.</span>
          </h1>

          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
            Drop any image or video. SajakAI scans it for synthetic manipulation in seconds.
          </p>
        </div>

        {/* ── Drop zone ─────────────────────────────────────────────────── */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file for deepfake scan"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onMouseEnter={() => !file && setHoverDrop(true)}
          onMouseLeave={() => setHoverDrop(false)}
          onClick={() => !file && fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            maxHeight: 420,
            border: `1.5px dashed ${dropBorderColor}`,
            borderStyle: file ? "solid" : "dashed",
            borderRadius: 16,
            background: dropBg,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 14,
            cursor: file ? "default" : "pointer",
            overflow: "hidden",
            transition: "all 0.22s ease",
          }}
        >
          {/* Preview image */}
          {preview && (
            <img
              src={preview}
              alt="Uploaded preview"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
                borderRadius: 16,
              }}
            />
          )}

          {/* Video placeholder (no thumbnail) */}
          {file && !preview && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 8,
            }}>
              <div style={{ fontSize: 36 }}>▶</div>
              <p style={{ fontSize: 13, color: C.muted }}>{file.name}</p>
            </div>
          )}

          {/* Scan overlay */}
          {scanning && <ScanOverlay />}

          {/* Remove button */}
          {file && !scanning && (
            <button
              onClick={removeFile}
              aria-label="Remove file"
              style={{
                position: "absolute", top: 10, right: 10, zIndex: 5,
                width: 30, height: 30, borderRadius: "50%",
                background: C.surface,
                border: `0.5px solid ${C.border}`,
                color: C.muted,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 14,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderHover; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
            >
              ✕
            </button>
          )}

          {/* Empty-state prompt */}
          {!file && (
            <>
              {/* Upload icon circle */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: C.bg,
                border: `0.5px solid ${hoverDrop || isDragOver ? C.borderHover : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: hoverDrop || isDragOver ? C.accent : C.muted,
                transition: "all 0.22s ease",
              }}>
                ↑
              </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                  {isDragOver ? "Release to upload" : "Drop your file here"}
                </p>
                <p style={{ fontSize: 13, color: C.muted }}>
                  Image or video · up to 50 MB
                </p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{
                  padding: "7px 18px", borderRadius: 8,
                  background: "transparent",
                  border: `0.5px solid ${C.border}`,
                  fontSize: 13, color: C.muted,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderHover; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
              >
                Browse files
              </button>
            </>
          )}
        </div>

        {/* File type tags */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginTop: 12,
        }}>
          {["JPG", "PNG", "MP4", "WEBM", "MOV"].map(t => (
            <span key={t} style={{
              padding: "2px 9px", borderRadius: 999,
              background: C.surface,
              border: `0.5px solid ${C.border}`,
              fontSize: 11, color: C.faint,
              fontWeight: 500, letterSpacing: "0.04em",
            }}>
              {t}
            </span>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={onInputChange}
          style={{ display: "none" }}
        />

        {/* ── Scan button ──────────────────────────────────────────────── */}
        <button
          onClick={runScan}
          disabled={!file || scanning}
          onMouseEnter={() => setHoverScan(true)}
          onMouseLeave={() => setHoverScan(false)}
          style={{
            width: "100%",
            marginTop: "1.25rem",
            padding: "13px",
            borderRadius: 10,
            background: (!file || scanning)
              ? C.surface
              : (hoverScan ? C.accent + "dd" : C.accent),
            color: (!file || scanning) ? C.faint : "#000",
            border: `0.5px solid ${(!file || scanning) ? C.border : C.accent}`,
            fontSize: 15, fontWeight: 600,
            fontFamily: "inherit",
            cursor: (!file || scanning) ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            transform: hoverScan && file && !scanning ? "scale(1.01)" : "scale(1)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontSize: 16 }}>◎</span>
          {scanning ? "Scanning…" : "Scan for deepfakes"}
        </button>

        {/* ── Result card ───────────────────────────────────────────────── */}
        {result && !scanning && (
          <div style={{ marginTop: "1.5rem" }}>
            <ResultCard result={result} />
          </div>
        )}
      </main>
    </div>
  );
}
