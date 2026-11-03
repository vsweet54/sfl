"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState({ type: "normal", text: "Siap memproses tautan target." });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepTitle, setStepTitle] = useState("MEMBACA LINK...");
  const [timerText, setTimerText] = useState("0.0s");
  const [result, setResult] = useState(null);
  const [resultDuration, setResultDuration] = useState("0.0s");
  const [history, setHistory] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Ambil riwayat dari LocalStorage saat halaman pertama kali dimuat
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

  // Tempel link langsung dari clipboard
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

  // Salin link ke clipboard
  const handleCopy = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert("Gagal menyalin link.");
    }
  };

  // Hapus semua riwayat
  const handleClearHistory = () => {
    localStorage.removeItem("sfl_history");
    setHistory([]);
  };

  // Eksekusi proses bypass ke endpoint Vercel
  const handleBypass = async () => {
    const target = url.trim();
    if (!target) {
      setStatus({ type: "error", text: "Harap tempelkan tautan target terlebih dahulu!" });
      return;
    }

    setLoading(true);
    setResult(null);
    setCurrentStep(0);
    setStepTitle("MEMBACA LINK...");
    setStatus({ type: "loading", text: "Sedang memproses tautan..." });
    startTimer();

    try {
      // Langkah 1: Membaca Link
      await sleep(250);

      // Langkah 2: Memvalidasi Link
      setCurrentStep(1);
      setStepTitle("MEMVALIDASI LINK...");
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        throw new Error("URL tidak valid. Awali dengan http:// atau https://");
      }
      await sleep(200);

      // Langkah 3: Koneksi Server Vercel Proxy
      setCurrentStep(2);
      setStepTitle("MENGHUBUNGKAN SERVER...");

      const response = await fetch("/api/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      // Langkah 4: Ekstraksi Safelink Zapi
      setCurrentStep(3);
      setStepTitle("EKSTRAKSI SAFELINK...");
      const resData = await response.json();

      if (!response.ok || resData.success === false) {
        const errMsg = resData.message || resData?.data?.message || "Gagal membypass link.";
        throw new Error(errMsg);
      }

      // Langkah 5: Parsing respon (data.data.finalUrl)
      const finalDestination =
        resData?.data?.data?.finalUrl ||
        resData?.finalUrl ||
        resData?.result;

      if (!finalDestination) {
        throw new Error("Tautan tujuan tidak ditemukan dalam respon.");
      }

      setCurrentStep(4);
      setStepTitle("SELESAI!");
      stopTimer();

      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1) + "s";
      setTimerText(elapsed);
      setResultDuration(elapsed);

      setResult(finalDestination);
      setStatus({ type: "normal", text: "Tautan berhasil di-bypass!" });

      // Simpan ke riwayat lokal
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

  return (
    <div style={{ backgroundColor: "#0b0d13", color: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif", display: "flex", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Header / Navbar dengan Logo Gambar Asli */}
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
              <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#f8fafc" }}>SFL Bypasser</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>by NEO</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#141721", border: "1px solid #1d2232", padding: "5px 12px", borderRadius: "100px", fontSize: "0.75rem" }}>
            <span style={{ width: "6px", height: "6px", backgroundColor: "#10b981", borderRadius: "50%" }}></span>
            <span style={{ color: "#94a3b8" }}>API Kuota</span>
            <span style={{ fontWeight: "600", color: "#fff" }}>Online</span>
          </div>
        </header>

        {/* Hero Section */}
        <section>
          <div style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.22)", color: "#06b6d4", fontSize: "0.7rem", fontWeight: "600", padding: "3px 10px", borderRadius: "100px", marginBottom: "8px" }}>
            Instant Bypass
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: "700", margin: "0 0 6px 0" }}>Bypass Tautan Safelink</h1>
          <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: 0 }}>Dapatkan tautan tujuan langsung secara instan tanpa iklan atau waktu tunggu.</p>
        </section>

        {/* Form Input & Action Card */}
        <section style={{ background: "#131722", border: "1px solid #1d2232", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#090a0f", border: "1px solid #1d2232", borderRadius: "10px", padding: "4px 8px 4px 12px", gap: "6px" }}>
            <input
              type="text"
              placeholder="Tempel link safelink..."
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
            {loading ? "Memproses..." : "Bypass Sekarang"}
          </button>

          {/* Stepper Progress Modern */}
          {loading && (
            <div style={{ marginTop: "16px", background: "#0d111a", border: "1px solid rgba(6, 182, 212, 0.22)", borderRadius: "10px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "#06b6d4", fontFamily: "monospace" }}>{stepTitle}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace" }}>{timerText}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
                {["Membaca", "Validasi", "Server", "Ekstraksi", "Selesai"].map((label, idx) => (
                  <div key={idx} style={{ flex: 1, textAlign: "center", opacity: currentStep >= idx ? 1 : 0.3 }}>
                    <div style={{ width: "36px", height: "36px", margin: "0 auto 4px", borderRadius: "8px", background: currentStep >= idx ? "rgba(6, 182, 212, 0.15)" : "#131824", border: `1.5px solid ${currentStep >= idx ? "#06b6d4" : "#1d2232"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#06b6d4", fontSize: "0.75rem", fontWeight: "bold" }}>
                      {currentStep > idx ? "✓" : idx + 1}
                    </div>
                    <span style={{ fontSize: "0.55rem", color: currentStep >= idx ? "#fff" : "#64748b" }}>{label}</span>
                  </div>
                ))}
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

        {/* Riwayat Pemrosesan */}
        <section style={{ background: "#131722", border: "1px solid #1d2232", borderRadius: "14px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>Riwayat Bypass ({history.length})</div>
            {history.length > 0 && (
              <button type="button" onClick={handleClearHistory} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.72rem", cursor: "pointer" }}>
                Bersihkan
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", padding: "10px 0" }}>Belum ada riwayat.</div>
            ) : (
              history.map((item, i) => (
                <div key={i} style={{ background: "#090a0f", border: "1px solid #1d2232", borderRadius: "6px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    <div style={{ color: "#06b6d4", fontSize: "0.75rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{item.dest}</div>
                    <div style={{ color: "#64748b", fontSize: "0.65rem" }}>Jam {item.time}</div>
                  </div>
                  <button type="button" onClick={() => handleCopy(item.dest)} style={{ background: "transparent", border: "1px solid #1d2232", color: "#94a3b8", fontSize: "0.68rem", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>
                    Salin
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Panduan Penggunaan Ringkas */}
        <section style={{ background: "#131722", border: "1px solid #1d2232", borderRadius: "14px", padding: "16px" }}>
          <div style={{ fontWeight: "600", fontSize: "0.85rem", marginBottom: "10px" }}>Panduan Singkat</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.75rem" }}>
            <div style={{ background: "#090a0f", padding: "8px", borderRadius: "6px", border: "1px solid #1d2232" }}>
              <b style={{ color: "#06b6d4" }}>1. Salin Link</b>
              <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Salin tautan shortener yang ingin di-bypass.</p>
            </div>
            <div style={{ background: "#090a0f", padding: "8px", borderRadius: "6px", border: "1px solid #1d2232" }}>
              <b style={{ color: "#06b6d4" }}>2. Klik Tempel</b>
              <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Gunakan tombol tempel untuk memasukkan link.</p>
            </div>
            <div style={{ background: "#090a0f", padding: "8px", borderRadius: "6px", border: "1px solid #1d2232" }}>
              <b style={{ color: "#06b6d4" }}>3. Bypass</b>
              <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Tekan Bypass Sekarang dan tunggu proses stepper.</p>
            </div>
            <div style={{ background: "#090a0f", padding: "8px", borderRadius: "6px", border: "1px solid #1d2232" }}>
              <b style={{ color: "#06b6d4" }}>4. Buka Tujuan</b>
              <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Langsung salin atau klik buka tautan tujuan.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", color: "#64748b", fontSize: "0.72rem", marginTop: "auto", paddingBottom: "10px" }}>
          SFL Bypasser • Crafted by <b>NEO</b>
        </footer>

      </div>
    </div>
  );
}
