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
  { match: (u) => /sub2unlock\.com/i.test(u),       endpoint: "/v1/bypass-tools:sub2unlock/bypass",  resultKey: ["destinationUrl"] },
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

// Status / pesan yang dianggap "kuota habis" -> pindah ke key berikutnya
const isExhausted = (status, raw) =>
  [401, 402, 403, 429].includes(status) ||
  /limit|quota|kuota|habis|exceed|insufficient|credit/i.test(raw);

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

    let last = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];

      let response, rawText;
      try {
        response = await fetch(`${TARGET_URL}?url=${encodeURIComponent(targetLink)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          signal: AbortSignal.timeout(25000),
        });
        rawText = await response.text();
      } catch (err) {
        last = { success: false, status: 502, data: err.message, keyUsed: i + 1, endpoint: rule.endpoint };
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      last = { success: response.ok, status: response.status, data, keyUsed: i + 1, endpoint: rule.endpoint };

      if (response.ok || !isExhausted(response.status, rawText)) {
        // Ekstrak finalUrl berdasarkan rule
        const finalUrl = extractResult({ data }, rule.resultKey);
        return Response.json({ ...last, finalUrl });
      }
      // Kuota habis -> lanjut key berikutnya
    }

    return Response.json(
      { ...last, message: "Semua API key habis atau terkena limit" },
      { status: last?.status || 429 }
    );
  } catch (error) {
    return Response.json({ success: false, errorDetail: error.message }, { status: 500 });
  }
}
