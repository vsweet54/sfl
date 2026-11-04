export const maxDuration = 30;

// ─── URL Matcher → Endpoint Zapi ────────────────────────────────────────────
// Urutan penting: lebih spesifik dulu, baru umum.
const BYPASS_RULES = [
  // Paste services (harus sebelum short-link)
  { match: (u) => /pastebin\.com/i.test(u),        endpoint: "/v1/bypass-tools:pastebin/raw",        resultKey: ["content"] },
  { match: (u) => /pastefy\.app/i.test(u),          endpoint: "/v1/bypass-tools:pastefy/get",         resultKey: ["content"] },
  { match: (u) => /pastelua\.com/i.test(u),         endpoint: "/v1/bypass-tools:pastelua/get",        resultKey: ["loadstring", "content"] },
  { match: (u) => /paste-drop\.com/i.test(u),       endpoint: "/v1/bypass-tools:paste-drop/get",     resultKey: ["content"] },
  { match: (u) => /paster\.so/i.test(u),            endpoint: "/v1/bypass-tools:paster-so/get",      resultKey: ["content"] },
  { match: (u) => /tempel\.in/i.test(u),            endpoint: "/v1/bypass-tools:tempel-in/resolve",  resultKey: ["content"] },
  { match: (u) => /rentry\.(co|org)/i.test(u),      endpoint: "/v1/bypass-tools:rentry/raw",         resultKey: ["content"] },

  // Script sites
  { match: (u) => /gzenx\.com/i.test(u),            endpoint: "/v1/bypass-tools:gzenx/resolve",      resultKey: ["script"] },
  { match: (u) => /scriptpastebins\.com/i.test(u),  endpoint: "/v1/bypass-tools:scriptpastebins/resolve", resultKey: ["script"] },

  // Key systems
  { match: (u) => /boblox-script\.com/i.test(u),    endpoint: "/v1/bypass-tools:blox-script/resolve", resultKey: ["key"] },
  { match: (u) => /platorelay\.com/i.test(u),        endpoint: "/v1/bypass-tools:platoboost/resolve", resultKey: ["key"] },

  // Social lockers
  { match: (u) => /link2unlock\.com/i.test(u),      endpoint: "/v1/bypass-tools:link2unlock/resolve", resultKey: ["primaryUrl", "unlocks"] },
  { match: (u) => /linkzy\.space/i.test(u),         endpoint: "/v1/bypass-tools:linkzy/resolve",     resultKey: ["destinationUrl"] },
  { match: (u) => /socialwolvez\.com/i.test(u),     endpoint: "/v1/bypass-tools:socialwolvez/resolve",resultKey: ["finalUrl"] },
  { match: (u) => /mboost\.me/i.test(u),            endpoint: "/v1/bypass-tools:mboost/resolve",     resultKey: ["destinationUrl"] },
  { match: (u) => /sub2unlock\.(com|io|net)/i.test(u),       endpoint: "/v1/bypass-tools:sub2unlock/bypass",  resultKey: ["destinationUrl"] },
  { match: (u) => /sub4unlock\.co/i.test(u),        endpoint: "/v1/bypass-tools:sub4unlock/resolve", resultKey: ["finalUrl"] },

  // Linkvertise family
  { match: (u) => /linkvertise\.com|link-to\.net|link-hub\.net|link-target\.(org|net)|link-center\.net|direct-link\.net/i.test(u),
    endpoint: "/v1/bypass-tools:linkvertise/resolve", resultKey: ["url"] },

  // Short-link lockers
  { match: (u) => /go\.linkify\.ru/i.test(u),       endpoint: "/v1/bypass-tools:linkify/resolve",    resultKey: ["destinationUrl"] },
  { match: (u) => /clk\.sh|oko\.sh|oii\.la/i.test(u), endpoint: "/v1/bypass-tools:clk-sh/resolve",  resultKey: ["finalUrl"] },
  { match: (u) => /l1nq\.com|encurtador\.dev/i.test(u), endpoint: "/v1/bypass-tools:encurtador/resolve", resultKey: ["url"] },
  { match: (u) => /ez4short\.com/i.test(u),         endpoint: "/v1/bypass-tools:ez4short/resolve",   resultKey: ["url"] },
  { match: (u) => /shrinkme\.(click|io)/i.test(u),  endpoint: "/v1/bypass-tools:shrinkme/resolve",   resultKey: ["finalUrl"] },
  { match: (u) => /sfl\.gl|safelinku\.com|linku\.to|lokerwfh\.net/i.test(u),
    endpoint: "/v1/bypass-tools:safelinku/resolve",  resultKey: ["finalUrl"] },
  { match: (u) => /tpi\.li|oil\.la|tii\.la|oei\.la|iir\.la|tvi\.la|lnbz\.la/i.test(u),
    endpoint: "/v1/bypass-tools:tpi-li/resolve",     resultKey: ["destinationUrl"] },
  { match: (u) => /bit\.ly|bitly\.is|j\.mp|amzn\.to/i.test(u),
    endpoint: "/v1/bypass-tools:bitly/resolve",      resultKey: ["destinationUrl"] },

  // Yasir252 (downloader site)
  { match: (u) => /yasir252\.com/i.test(u),         endpoint: "/v1/bypass-tools:yasir252/resolve",   resultKey: ["boxes"] },
];

const BASE_URL = "https://api.zapi.ink";

// Cari rule yang cocok dengan URL input
function detectRule(url) {
  return BYPASS_RULES.find((r) => r.match(url)) || null;
}

// Ekstrak nilai final dari nested response berdasarkan resultKey array
function extractResult(data, resultKeys) {
  const content = data?.data?.content ?? data?.content ?? data;
  for (const key of resultKeys) {
    if (content?.[key] !== undefined && content[key] !== null) {
      // Kalau array (misal unlocks), ambil elemen pertama .url
      if (Array.isArray(content[key]) && content[key][0]?.url) {
        return content[key][0].url;
      }
      // Kalau string
      if (typeof content[key] === "string") return content[key];
    }
  }
  return null;
}

// Ambil pesan error dari respon provider (string pendek)
function getErrMessage(data) {
  if (typeof data === "string") return data.slice(0, 200);
  const m = data?.message || data?.error?.message || data?.error || data?.detail || data?.data?.message;
  return m ? String(typeof m === "string" ? m : JSON.stringify(m)).slice(0, 200) : "";
}

// Klasifikasi kegagalan:
//  - "exhausted": kuota/limit key habis  -> coba key berikutnya
//  - "auth"     : key ditolak (401/403)  -> coba key berikutnya
//  - "other"    : error lain (link salah, endpoint error, dll) -> berhenti, tampilkan pesan asli
// Regex hanya dicek ke PESAN error (bukan seluruh body) supaya kata "limit" di data tidak salah deteksi.
function classify(status, msg) {
  if (status === 402 || status === 429) return "exhausted";
  if (/rate.?limit|too many requests|quota|kuota|out of credit|insufficient|exceeded/i.test(msg)) return "exhausted";
  if (status === 401 || status === 403) return "auth";
  return "other";
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetLink = (body.url || "").trim();

    if (!targetLink) {
      return Response.json({ success: false, message: "URL kosong" }, { status: 400 });
    }

    try {
      new URL(targetLink);
    } catch {
      return Response.json({ success: false, message: "Format URL tidak valid" }, { status: 400 });
    }

    // Deteksi rule
    const rule = detectRule(targetLink);
    if (!rule) {
      return Response.json(
        { success: false, message: "URL tidak dikenali. Domain ini belum didukung." },
        { status: 422 }
      );
    }

    const TARGET_URL = BASE_URL + rule.endpoint;

    // Urutan key: KEY_1, KEY_2, KEY_3, KEY
    const apiKeys = [
      process.env.ZAPI_KEY_1,
      process.env.ZAPI_KEY_2,
      process.env.ZAPI_KEY_3,
      process.env.ZAPI_KEY,
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      return Response.json(
        { success: false, message: "API Key belum diatur di environment!" },
        { status: 500 }
      );
    }

    // Batas waktu total (maxDuration = 30s) supaya fungsi tidak mati sebelum membalas
    const deadline = Date.now() + 27000;
    const attempts = []; // ringkasan tiap percobaan (tanpa membocorkan API key)
    let last = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const remaining = deadline - Date.now();
      if (remaining < 2500) break; // sisa waktu terlalu sedikit

      const apiKey = apiKeys[i];

      let response, rawText;
      try {
        response = await fetch(`${TARGET_URL}?url=${encodeURIComponent(targetLink)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          signal: AbortSignal.timeout(Math.min(25000, remaining - 500)),
        });
        rawText = await response.text();
      } catch (err) {
        const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
        attempts.push({ key: i + 1, kind: timedOut ? "timeout" : "network", status: 0, message: err.message });
        last = { success: false, status: timedOut ? 504 : 502, data: err.message, keyUsed: i + 1, endpoint: rule.endpoint };
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      last = { success: response.ok, status: response.status, data, keyUsed: i + 1, endpoint: rule.endpoint };

      // Sukses HTTP, tapi body bisa saja menandakan gagal (success:false)
      const bodyFailed = response.ok && typeof data === "object" && data !== null && data.success === false;

      if (response.ok && !bodyFailed) {
        const finalUrl = extractResult({ data }, rule.resultKey);
        return Response.json({ ...last, finalUrl });
      }

      const msg = getErrMessage(data);
      const kind = classify(response.ok ? 400 : response.status, msg);
      attempts.push({ key: i + 1, kind, status: response.status, message: msg });

      if (kind === "other") {
        // Bukan masalah kuota -> jangan menyalahkan API key, tampilkan pesan asli provider
        return Response.json(
          {
            ...last,
            success: false,
            message: msg || `Provider mengembalikan error (status ${response.status}).`,
            attempts,
          },
          { status: response.ok ? 502 : response.status }
        );
      }
      // exhausted / auth -> lanjut key berikutnya
    }

    // Semua percobaan gagal -> buat pesan sesuai penyebab sebenarnya
    const kinds = attempts.map((a) => a.kind);
    const summary = attempts.map((a) => `Key ${a.key}: ${a.kind}${a.status ? " " + a.status : ""}`).join(", ");
    let message, status;

    if (attempts.length === 0) {
      message = "Waktu habis sebelum server sempat merespons. Coba lagi.";
      status = 504;
    } else if (kinds.every((k) => k === "exhausted")) {
      message = "Semua API key habis atau terkena limit";
      status = 429;
    } else if (kinds.every((k) => k === "auth")) {
      message = "API key ditolak provider (401/403). Cek ZAPI_KEY di environment.";
      status = 401;
    } else if (kinds.every((k) => k === "timeout" || k === "network")) {
      message = "Server bypass tidak merespons (timeout). Coba lagi sebentar lagi.";
      status = 504;
    } else {
      message = "Semua key gagal dipakai.";
      status = last?.status || 502;
    }

    return Response.json(
      { ...last, success: false, message: `${message} [${summary}]`, attempts },
      { status }
    );
  } catch (error) {
    return Response.json({ success: false, errorDetail: error.message }, { status: 500 });
  }
}
