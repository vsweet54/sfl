"use client";

import { useState, useEffect, useRef } from "react";

const SUPPORTED = [
  ["Bitly", "bit.ly"],
  ["Clk.sh", "clk.sh"],
  ["tpi.li", "tpi.li"],
  ["Safelinku", "sfl.gl"],
  ["Linkvertise", "linkvertise.com"],
  ["Encurtador / l1nq", "l1nq.com"],
  ["EZ4Short", "ez4short.com"],
  ["Link2Unlock", "link2unlock.com"],
  ["Linkify", "go.linkify.ru"],
  ["Linkzy", "linkzy.space"],
  ["MBoost", "mboost.me"],
  ["Shrinkme", "shrinkme.click"],
  ["SocialWolvez", "socialwolvez.com"],
  ["Sub2Unlock", "sub2unlock.com"],
  ["Sub4Unlock", "sub4unlock.co"],
  ["Platoboost", "platorelay.com"],
  ["Blox-Script", "boblox-script.com"],
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState({ type: "normal", text: "Siap memproses tautan target." });
  const [loading, setLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTitle, setStepTitle] = useState("MEMBACA LINK...");
  const [timerText, setTimerText] = useState("0.0s");
  const [result, setResult] = useState(null);
  const [resultDuration, setResultDuration] = useState("0.0s");
  const [history, setHistory] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sfl_history") || "[]");
      setHistory(saved);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setTimerText("0.0s");
    timerRef.current = setInterval(() => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setTimerText(`${elapsed}s`);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setStatus({ type: "normal", text: "Tautan ditempel dari papan klip." });
      }
    } catch {
      setStatus({ type: "error", text: "Gagal membaca papan klip. Izin tidak diberikan." });
    }
  };

  const handleCopy = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert("Gagal menyalin link.");
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem("sfl_history");
    setHistory([]);
  };

  const handleBypass = async () => {
    const target = url.trim();
    if (!target) {
      setStatus({ type: "error", text: "Harap tempelkan tautan target terlebih dahulu!" });
      return;
    }

    setLoading(true);
    setShowProgress(true);
    setResult(null);
    setCurrentStep(0);
    setStepTitle("MEMBACA LINK...");
    setStatus({ type: "loading", text: "Sedang memproses tautan..." });
    startTimer();

    try {
      // Step 1: Membaca Link
      await sleep(350);

      // Step 2: Validasi Link
      setCurrentStep(1);
      setStepTitle("MEMVALIDASI LINK...");
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        throw new Error("URL tidak valid. Awali dengan http:// atau https://");
      }
      await sleep(300);

      // Step 3: Koneksi Server
      setCurrentStep(2);
      setStepTitle("KONEKSI SERVER...");

      const response = await fetch("/api/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      // Step 4: Ekstraksi URL
      setCurrentStep(3);
      setStepTitle("EKSTRAKSI URL...");
      const resData = await response.json();

      if (!response.ok || resData.success === false) {
        const errMsg =
          resData.message ||
          resData?.data?.message ||
          (response.status === 422 ? "Domain ini belum didukung oleh bypass tool." : "Gagal membypass link.");
        throw new Error(errMsg);
      }

      // Step 5: Selesai
      // route.js sekarang selalu mengembalikan finalUrl di top-level
      const finalDestination =
        resData?.finalUrl ||
        resData?.data?.data?.finalUrl ||
        resData?.data?.finalUrl ||
        resData?.result;

      if (!finalDestination) {
        throw new Error("Tautan tujuan tidak ditemukan dalam respon.");
      }

      setCurrentStep(4);
      setStepTitle("PROSES SELESAI!");
      stopTimer();

      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1) + "s";
      setTimerText(elapsed);
      setResultDuration(elapsed);

      setResult(finalDestination);
      setStatus({ type: "normal", text: "Tautan berhasil di-bypass!" });

      const newHistory = [
        {
          dest: finalDestination,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...history,
      ].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem("sfl_history", JSON.stringify(newHistory));
    } catch (err) {
      stopTimer();
      setStatus({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 5 Ikon SVG Stepper persis desain asli
  const stepItems = [
    {
      label: "Membaca Link",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    {
      label: "Validasi Link",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    },
    {
      label: "Koneksi Server",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      )
    },
    {
      label: "Ekstraksi URL",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    {
      label: "Selesai",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    }
  ];

  return (
    <div style={{ backgroundColor: "#0b0d13", color: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif", display: "flex", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Navbar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid #1d2232" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ 
              width: "42px", 
              height: "42px", 
              borderRadius: "50%", 
              padding: "2px",
              background: "linear-gradient(135deg, #06b6d4, #a855f7)", 
              boxShadow: "0 0 14px rgba(6, 182, 212, 0.4)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden"
            }}>
              <img 
                src="/logo.png" 
                alt="Logo NEO" 
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerText = 'NEO';
                }}
              />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#f8fafc" }}>NEO Bypasser</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>by NEO</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#141721", border: "1px solid #1d2232", padding: "5px 12px", borderRadius: "100px", fontSize: "0.75rem" }}>
            <span style={{ width: "6px", height: "6px", backgroundColor: "#10b981", borderRadius: "50%" }}></span>
            <span style={{ color: "#94a3b8" }}>API Kuota</span>
            <span style={{ fontWeight: "600", color: "#fff" }}>Online</span>
          </div>
        </header>

        {/* Hero */}
        <section>
          <div style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.22)", color: "#06b6d4", fontSize: "0.7rem", fontWeight: "600", padding: "3px 10px", borderRadius: "100px", marginBottom: "8px" }}>
            Instant Bypass
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: "700", margin: "0 0 6px 0" }}>Multi Bypass Tool</h1>
          <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: 0 }}>Auto-detect & bypass safelink, shortlink, locker, paste, dan key system secara instan.</p>
        </section>

        {/* Pesan Berjalan: daftar link yang didukung */}
        <style>{`
          @keyframes neoRun { to { transform: translateX(-50%); } }
          .neo-mq:hover .neo-tk, .neo-mq:active .neo-tk { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) { .neo-tk { animation: none !important; } }
        `}</style>
        <div
          className="neo-mq"
          style={{ display: "flex", alignItems: "center", gap: "10px", background: "#131722", border: "1px solid #1d2232", borderRadius: "12px", padding: "8px 10px", overflow: "hidden" }}
        >
          <b style={{ flexShrink: 0, fontSize: "0.68rem", fontWeight: "700", color: "#06b6d4", background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.25)", borderRadius: "6px", padding: "4px 8px", fontFamily: "monospace" }}>
            DIDUKUNG
          </b>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
              maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
            }}
          >
            <div className="neo-tk" style={{ display: "flex", width: "max-content", animation: "neoRun 55s linear infinite" }}>
              {[0, 1].map((n) => (
                <div key={n} style={{ display: "flex", gap: "8px", paddingRight: "8px" }}>
                  {SUPPORTED.map(([name, domain]) => (
                    <div key={n + name} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", background: "#090a0f", border: "1px solid #1d2232", borderRadius: "100px", padding: "5px 11px", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: "600", color: "#f8fafc" }}>{name}</span>
                      <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.68rem" }}>{domain}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Input & Action Card */}
        <section style={{ background: "#131722", border: "1px solid #1d2232", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#090a0f", border: "1px solid #1d2232", borderRadius: "10px", padding: "4px 8px 4px 12px", gap: "6px" }}>
            <input
              type="text"
              placeholder="Tempel link target (safelink, shortlink, paste...)..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontSize: "0.85rem", padding: "6px 0" }}
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                title="Hapus teks"
                style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "none", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={handlePaste}
              style={{ background: "#1c2232", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", padding: "6px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
            >
              Tempel
            </button>
          </div>

          {/* Status Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", margin: "12px 2px", color: status.type === "error" ? "#ef4444" : status.type === "loading" ? "#06b6d4" : "#64748b" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: status.type === "error" ? "#ef4444" : status.type === "loading" ? "#06b6d4" : "#64748b" }}></span>
            <span>{status.text}</span>
          </div>

          <button
            type="button"
            onClick={handleBypass}
            disabled={loading}
            style={{ width: "100%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Memproses..." : "Bypass Sekarang →"}
          </button>

          {/* Stepper Progress Box */}
          {showProgress && (
            <div style={{ marginTop: "18px", background: "#0d111a", border: "1px solid rgba(6, 182, 212, 0.28)", borderRadius: "12px", padding: "16px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", backgroundColor: "#06b6d4", borderRadius: "50%", boxShadow: "0 0 8px #06b6d4" }}></span>
                  <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#06b6d4", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                    {stepTitle}
                  </span>
                </div>
                <span style={{ fontSize: "0.76rem", color: "#64748b", fontFamily: "monospace" }}>{timerText}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
                {stepItems.map((item, idx) => {
                  const isDone = currentStep > idx || currentStep === 4;
                  const isActive = currentStep === idx && currentStep !== 4;

                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: isDone || isActive ? 1 : 0.35, transition: "all 0.25s ease" }}>
                      <div style={{ 
                        width: "48px", 
                        height: "48px", 
                        borderRadius: "12px", 
                        background: isActive ? "rgba(6, 182, 212, 0.15)" : "#131824", 
                        border: `1.5px solid ${isActive || isDone ? "#06b6d4" : "#1d2232"}`, 
                        boxShadow: isActive ? "0 0 12px rgba(6, 182, 212, 0.35)" : "none",
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        position: "relative",
                        color: "#06b6d4"
                      }}>
                        {item.icon}
                        {isDone && (
                          <span style={{ position: "absolute", top: "3px", right: "5px", fontSize: "0.68rem", fontWeight: "bold", color: "#06b6d4" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.58rem", fontFamily: "monospace", textAlign: "center", color: isDone ? "#06b6d4" : isActive ? "#fff" : "#64748b", lineHeight: "1.2" }}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div style={{ marginTop: "16px", background: "#10141f", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#10b981" }}>✓ Berhasil di-bypass</span>
                <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>{resultDuration}</span>
              </div>
              <div style={{ background: "#090a0f", border: "1px solid #1d2232", borderRadius: "6px", padding: "8px 10px", fontSize: "0.82rem", color: "#06b6d4", wordBreak: "break-all", fontFamily: "monospace", marginBottom: "12px" }}>
                {result}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleCopy(result)}
                  style={{ background: "#181c28", border: "1px solid #1d2232", color: "#fff", padding: "7px 12px", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}
                >
                  {copySuccess ? "Tersalin!" : "Salin Link"}
                </button>
                <a
                  href={result}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: "#10b981", color: "#000", fontWeight: "600", padding: "7px 12px", borderRadius: "6px", fontSize: "0.78rem", textDecoration: "none" }}
                >
                  Buka Tautan ↗
                </a>
              </div>
            </div>
          )}
        </section>

        {/* History Section */}
        <section style={{ background: "#131722", border: "1px solid #1d2232", borderRadius: "14px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.9rem" }}>🕒
