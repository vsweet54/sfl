"use client";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBypass = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal memproses bypass");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", textAlign: "center" }}>SFL Bypasser Tester</h2>
        
        <input
          type="text"
          placeholder="Tempel link SFL di sini..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box", marginBottom: "1rem" }}
        />

        <button
          onClick={handleBypass}
          disabled={loading}
          style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "none", backgroundColor: loading ? "#64748b" : "#3b82f6", color: "#fff", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Memproses..." : "Bypass Sekarang"}
        </button>

        {error && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#7f1d1d", borderRadius: "6px", fontSize: "0.875rem", color: "#fecaca" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#022c22", borderRadius: "8px", border: "1px solid #059669" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#6ee7b7" }}>Respon dari Server:</p>
            <pre style={{ margin: 0, padding: "0.5rem", backgroundColor: "#064e3b", borderRadius: "4px", fontSize: "0.75rem", overflowX: "auto", color: "#ecfdf5" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
