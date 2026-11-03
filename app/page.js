"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * NEO Bypasser — app/page.js (Next.js App Router + Tailwind)
 *
 * Endpoint bypass diatur lewat env:
 *   NEXT_PUBLIC_BYPASS_API=/api/bypass          (default)
 *
 * Request  : GET  {API}?url=<link-target-ter-encode>
 * Response : JSON, salah satu field ini dianggap hasil:
 *            result | destination | url | bypassed | key | data
 *            Jika gagal: { error | message } atau status HTTP bukan 2xx.
 */

const API_URL = process.env.NEXT_PUBLIC_BYPASS_API || "/api/bypass";
const HISTORY_KEY = "neo-bypasser-history";
const HISTORY_MAX = 30;
const REQUEST_TIMEOUT_MS = 45000;

const SUPPORTED = [
  ["Bitly", "bit.ly"],
  ["Clk.sh", "clk.sh"],
  ["tpi.li", "tpi.li"],
  ["Safelinku", "sfl.gl"],
  ["Linkvertise", "linkvertise.com"],
  ["Encurtador / l1nq", "l1nq.com"],
  ["EZ4Short", "ez4short.com"],
  ["Link2Unlock", "link2unlock.com"],
  ["Platoboost", "platorelay.com"],
  ["Blox-Script", "boblox-script.com"],
];

const STEP_TITLES = [
  "MEMBACA LINK...",
  "MEMVALIDASI LINK...",
  "KONEKSI SERVER...",
  "EKSTRAKSI URL...",
  "PROSES SELESAI!",
];

const Icon = ({ children }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const STEP_ITEMS = [
  {
    label: "Membaca Link",
    icon: (
      <Icon>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </Icon>
    ),
  },
  {
    label: "Validasi Link",
    icon: (
      <Icon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </Icon>
    ),
  },
  {
    label: "Koneksi Server",
    icon: (
      <Icon>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </Icon>
    ),
  },
  {
    label: "Ekstraksi URL",
    icon: (
      <Icon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </Icon>
    ),
  },
  {
    label: "Selesai",
    icon: (
      <Icon>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </Icon>
    ),
  },
];

const GUIDE = [
  {
    title: "Salin Tautan",
    body: "Salin link target: safelink, shortlink, locker, paste, atau key system yang ingin di-bypass.",
  },
  {
    title: "Tempelkan Link",
    body: (
      <>
        Tekan tombol <b className="text-cyan-400 font-semibold">Tempel</b> untuk memasukkan URL
        secara otomatis.
      </>
    ),
  },
  {
    title: "Mulai Bypass",
    body: (
      <>
        Klik tombol <b className="text-cyan-400 font-semibold">Bypass Sekarang</b> dan pantau
        indikator langkah.
      </>
    ),
  },
  {
    title: "Buka Tujuan",
    body: (
      <>
        Salin tautan asli atau klik <b className="text-cyan-400 font-semibold">Buka Tautan</b>{" "}
        untuk langsung menuju tujuan.
      </>
    ),
  },
];

// ---------- helpers ----------

function normalizeUrl(raw) {
  let value = (raw || "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  try {
    const u = new URL(value);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function pickResult(data) {
  if (data == null) return null;
  if (typeof data === "string") return data.trim() || null;
  const keys = ["result", "destination", "url", "bypassed", "key", "data"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const nested = pickResult(v);
      if (nested) return nested;
    }
  }
  return null;
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(value || "");
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- components ----------

function Stepper({ current }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {STEP_ITEMS.map((item, idx) => {
        const isDone = current > idx || current === 4;
        const isActive = current === idx && current !== 4;
        const opacity = isDone || isActive ? "opacity-100" : "opacity-35";
        const box = isActive
          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.5)] border-2"
          : isDone
          ? "bg-[#131824] border-cyan-500/80 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] border"
          : "bg-[#131824] border-[#1d2232] text-slate-400 border";
        const label = isDone
          ? "text-cyan-400"
          : isActive
          ? "text-white font-bold"
          : "text-slate-500";

        return (
          <div
            key={item.label}
            className={`flex flex-col items-center gap-1.5 ${opacity} transition-all duration-300`}
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center relative ${box}`}
            >
              {item.icon}
              {isDone && (
                <span className="absolute top-1 right-1 text-[0.6rem] font-bold text-cyan-400">
                  ✓
                </span>
              )}
            </div>
            <span className={`text-[0.55rem] font-mono text-center leading-tight ${label}`}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Ticker() {
  const items = SUPPORTED.map(([name, domain]) => (
    <span
      key={domain}
      className="shrink-0 flex items-center gap-1.5 bg-[#090a0f] border border-[#1d2232] rounded-full px-3 py-1 text-[0.72rem]"
    >
      <b className="text-white">{name}</b>
      <span className="text-slate-500 font-mono text-[0.65rem]">{domain}</span>
    </span>
  ));

  return (
    <div className="neo-mq flex items-center gap-2.5 bg-[#131722] border border-[#1d2232] rounded-xl p-2 overflow-hidden shadow-inner">
      <b className="shrink-0 text-[0.68rem] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-md px-2 py-1 font-mono">
        DIDUKUNG
      </b>
      <div className="flex-1 min-w-0 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div className="neo-tk flex w-max gap-2">
          <div className="flex gap-2">{items}</div>
          <div className="flex gap-2" aria-hidden="true">
            {items}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function Page() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState({ type: "idle", text: "Siap memproses tautan target." });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null); // { value, duration }
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);

  const startRef = useRef(0);
  const abortRef = useRef(null);

  // load history
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setHistory(saved);
    } catch {}
  }, []);

  const saveHistory = useCallback((list) => {
    setHistory(list);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch {}
  }, []);

  // live timer
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(id);
  }, [loading]);

  // cleanup
  useEffect(() => () => abortRef.current?.abort(), []);

  // link dihapus -> progres & hasil hilang, riwayat tetap
  useEffect(() => {
    if (url.trim() || loading) return;
    setStep(-1);
    setElapsed(0);
    setResult(null);
    setCopied(false);
    setStatus({ type: "idle", text: "Siap memproses tautan target." });
  }, [url, loading]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setStatus({ type: "idle", text: "Siap memproses tautan target." });
      }
    } catch {
      setStatus({
        type: "error",
        text: "Izin clipboard ditolak. Tempel manual ke kolom input.",
      });
    }
  };

  const handleBypass = async () => {
    if (loading) return;

    const target = normalizeUrl(url);
    if (!target) {
      setStatus({
        type: "error",
        text: url.trim()
          ? "Tautan tidak valid. Periksa kembali URL yang ditempel."
          : "Tempelkan tautan target terlebih dahulu.",
      });
      return;
    }

    setUrl(target);
    setResult(null);
    setLoading(true);
    setElapsed(0);
    startRef.current = Date.now();
    setStatus({ type: "loading", text: "Sedang memproses tautan..." });

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);

    try {
      setStep(0);
      await sleep(250);
      setStep(1);
      await sleep(250);
      setStep(2);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: target }),
        signal: controller.signal,
        cache: "no-store",
      });

      setStep(3);

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }

      const obj = data && typeof data === "object" ? data : {};
      const value =
        typeof obj.finalUrl === "string" && obj.finalUrl.trim() ? obj.finalUrl.trim() : null;

      if (!value) {
        const inner = obj.data && typeof obj.data === "object" ? obj.data : {};
        const msg =
          obj.message ||
          obj.errorDetail ||
          obj.error ||
          inner.message ||
          inner.error ||
          (typeof obj.data === "string" ? obj.data.slice(0, 160) : "") ||
          (obj.status
            ? `API bypass mengembalikan HTTP ${obj.status} tanpa hasil.`
            : `Server menolak permintaan (HTTP ${res.status}).`);
        throw new Error(String(msg));
      }

      const duration = (Date.now() - startRef.current) / 1000;
      setElapsed(duration);
      setStep(4);
      setResult({ value, duration });
      setStatus({ type: "success", text: "Tautan berhasil di-bypass!" });

      const entry = { dest: value, source: target, ts: Date.now() };
      saveHistory([entry, ...history.filter((h) => h.dest !== value)].slice(0, HISTORY_MAX));
    } catch (err) {
      setStep(-1);
      const aborted = err?.name === "AbortError" || controller.signal.aborted;
      setStatus({
        type: "error",
        text: aborted
          ? "Waktu habis. Server terlalu lama merespons, coba lagi."
          : err?.message || "Gagal memproses tautan.",
      });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    if (await copyText(result.value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyHistory = async (value, idx) => {
    if (await copyText(value)) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(-1), 1500);
    }
  };

  const dot =
    status.type === "error"
      ? "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
      : status.type === "success"
      ? "bg-emerald-400 shadow-[0_0_6px_#10b981]"
      : "bg-cyan-400 shadow-[0_0_6px_#06b6d4]";
  const statusColor =
    status.type === "error"
      ? "text-rose-400"
      : status.type === "success"
      ? "text-emerald-400"
      : status.type === "loading"
      ? "text-cyan-400"
      : "text-slate-400";

  const showProgress = loading || step >= 0;

  return (
    <main className="bg-[#0b0d13] text-[#f8fafc] font-sans min-h-screen flex justify-center p-4 sm:p-6 relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <style>{`
        @keyframes neoRun { to { transform: translateX(-50%); } }
        .neo-tk { animation: neoRun 55s linear infinite; }
        .neo-mq:hover .neo-tk, .neo-mq:active .neo-tk { animation-play-state: paused; }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.65; transform: translateX(-50%) scale(1.08); }
        }
        .animate-ambient { animation: pulseGlow 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .neo-tk, .animate-ambient { animation: none; }
        }
      `}</style>

      {/* Ambient glow */}
      <div className="fixed top-10 left-1/2 w-[500px] h-[320px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none animate-ambient" />
      <div className="fixed bottom-10 right-4 w-[350px] h-[250px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[560px] flex flex-col gap-5 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b border-[#1d2232]">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center font-bold text-xs tracking-wider">
              NEO
            </div>
            <div>
              <div className="font-bold text-[0.95rem] text-[#f8fafc]">NEO Bypasser</div>
              <div className="text-[0.72rem] text-[#64748b]">by NEO</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#141721] border border-[#1d2232] px-3 py-1 rounded-full text-[0.75rem]">
            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981]" />
            <span className="text-[#94a3b8]">API Kuota</span>
            <span className="font-semibold text-white">Online</span>
          </div>
        </header>

        {/* Hero */}
        <section>
          <span className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[0.7rem] font-semibold px-2.5 py-0.5 rounded-full mb-2">
            Instant Bypass
          </span>
          <h1 className="text-2xl font-bold mb-1 text-white">Multi Bypass Tool</h1>
          <p className="text-[0.84rem] text-[#94a3b8]">
            Auto-detect &amp; bypass safelink, shortlink, locker, paste, dan key system secara
            instan.
          </p>
        </section>

        <Ticker />

        {/* Main card */}
        <section className="relative group">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-purple-500/30 rounded-2xl blur-[2px] opacity-75" />

          <div className="relative bg-[#131722] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Input */}
            <div className="flex items-center bg-[#090a0f] border border-[#1d2232] focus-within:border-cyan-500/80 rounded-xl px-3 py-1.5 gap-2 transition duration-200">
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBypass()}
                placeholder="Tempel link target (safelink, shortlink, paste)..."
                aria-label="Link target"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#f8fafc] text-[0.85rem] placeholder-slate-600 py-1.5"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  aria-label="Hapus input"
                  className="text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={handlePaste}
                className="bg-[#1c2232] hover:bg-[#252c40] border border-white/5 text-[#94a3b8] hover:text-white px-2.5 py-1 rounded-lg text-[0.75rem] font-semibold transition active:scale-95 shrink-0"
              >
                Tempel
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-[0.78rem]" role="status" aria-live="polite">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
              <span className={statusColor}>{status.text}</span>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={handleBypass}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl text-[0.88rem] shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2"
            >
              {loading ? "Memproses..." : "Bypass Sekarang →"}
            </button>

            {/* Progress */}
            {showProgress && (
              <div className="bg-[#0d111a] border border-cyan-500/30 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full bg-cyan-400 ${
                        loading ? "animate-ping" : ""
                      }`}
                    />
                    <span className="text-[0.76rem] font-bold text-cyan-400 font-mono tracking-wider">
                      {STEP_TITLES[Math.max(step, 0)]}
                    </span>
                  </div>
                  <span className="text-[0.76rem] text-slate-400 font-mono">
                    {elapsed.toFixed(1)}s
                  </span>
                </div>
                <Stepper current={step} />
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-[#10141f] border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[0.75rem] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span> Berhasil di-bypass
                  </span>
                  <span className="text-[0.72rem] text-slate-400 font-mono">
                    {result.duration.toFixed(1)}s
                  </span>
                </div>
                <div className="bg-[#090a0f] border border-[#1d2232] rounded-lg p-2.5 text-[0.82rem] text-cyan-400 font-mono break-all select-all">
                  {result.value}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="bg-[#181c28] hover:bg-[#202636] border border-[#1d2232] text-white px-3 py-1.5 rounded-lg text-[0.78rem] transition active:scale-95"
                  >
                    {copied ? "Tersalin!" : "Salin Link"}
                  </button>
                  {isHttpUrl(result.value) && (
                    <a
                      href={result.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 py-1.5 rounded-lg text-[0.78rem] transition active:scale-95"
                    >
                      Buka Tautan ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* History */}
        <section className="bg-[#131722] border border-[#1d2232] rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>⏱</span>
              <span className="font-semibold text-[0.85rem]">Riwayat Bypass</span>
              <span className="bg-[#181c28] text-slate-400 text-[0.7rem] px-2 py-0.5 rounded-full font-mono">
                {history.length}
              </span>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => saveHistory([])}
                className="text-slate-500 hover:text-slate-400 text-[0.72rem]"
              >
                Bersihkan
              </button>
            )}
          </div>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-[#64748b] text-[0.75rem] py-2">
                Belum ada riwayat tautan.
              </div>
            ) : (
              history.map((item, i) => (
                <div
                  key={`${item.ts}-${i}`}
                  className="bg-[#090a0f] border border-[#1d2232] rounded-lg p-2.5 flex justify-between items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-cyan-400 text-[0.75rem] font-mono truncate">
                      {item.dest}
                    </div>
                    <div className="text-[#64748b] text-[0.65rem]">Jam {formatTime(item.ts)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyHistory(item.dest, i)}
                    className="border border-[#1d2232] text-[#94a3b8] text-[0.68rem] px-2 py-1 rounded hover:bg-white/5 shrink-0"
                  >
                    {copiedIdx === i ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Guide */}
        <section className="bg-[#131722] border border-[#1d2232] rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">ⓘ</span>
            <span className="font-semibold text-[0.9rem]">Panduan Penggunaan</span>
          </div>
          <div className="space-y-2.5">
            {GUIDE.map((g, i) => (
              <div
                key={g.title}
                className="bg-[#090a0f] border border-[#1d2232] rounded-xl p-3 flex gap-3 items-start"
              >
                <span className="font-mono text-[0.8rem] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 rounded-md px-2 py-0.5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <b className="block text-[0.84rem] text-white">{g.title}</b>
                  <p className="text-[0.75rem] text-[#94a3b8] leading-relaxed">{g.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-[#64748b] text-[0.72rem] py-3">
          NEO Bypasser • Crafted by <b className="text-slate-400">NEO</b>
        </footer>
      </div>
    </main>
  );
}
