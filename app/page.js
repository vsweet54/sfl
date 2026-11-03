export const maxDuration = 30;

// ============================================================
// Pemetaan domain/pola URL -> endpoint ZAPI
// Tambah/hapus sesuai kebutuhan
// ============================================================
const RESOLVERS = [
  // Safelinku / SFL.GL
  {
    name: "Safelinku / SFL.GL",
    pattern: /safelinku\.com|sfl\.gl/i,
    url: "https://api.zapi.ink/v1/bypass-tools:safelinku/resolve",
  },
  // Sub4Unlock
  {
    name: "Sub4Unlock",
    pattern: /sub4unlock\.co/i,
    url: "https://api.zapi.ink/v1/bypass-tools:sub4unlock/resolve",
  },
  // Linkvertise / Link-to.net
  {
    name: "Linkvertise / Link-to.net",
    pattern: /linkvertise\.com|link-to\.net/i,
    url: "https://api.zapi.ink/v1/bypass-tools:linkvertise/resolve",
  },
  // Clk.sh / Oko.sh
  {
    name: "Clk.sh / Oko.sh",
    pattern: /clk\.sh|oko\.sh/i,
    url: "https://api.zapi.ink/v1/bypass-tools:clksh/resolve",
  },
  // ShrinkMe
  {
    name: "ShrinkMe",
    pattern: /shrinkme\.io/i,
    url: "https://api.zapi.ink/v1/bypass-tools:shrinkme/resolve",
  },
  // Tpi.li / Tii.la
  {
    name: "Tpi.li / Tii.la",
    pattern: /tpi\.li|tii\.la/i,
    url: "https://api.zapi.ink/v1/bypass-tools:tpili/resolve",
  },
  // Link2Unlock (redirect publik)
  {
    name: "Link2Unlock",
    pattern: /link2unlock\.com/i,
    url: "https://api.zapi.ink/v1/bypass-tools:link2unlock/resolve",
  },
  // Platoboost (redirect publik)
  {
    name: "Platoboost",
    pattern: /platoboost\.com/i,
    url: "https://api.zapi.ink/v1/bypass-tools:platoboost/resolve",
  },
  // Bitly / J.mp
  {
    name: "Bitly / J.mp",
    pattern: /bit\.ly|j\.mp/i,
    url: "https://api.zapi.ink/v1/bypass-tools:bitly/resolve",
  },
  // TinyURL
  {
    name: "TinyURL",
    pattern: /tinyurl\.com/i,
    url: "https://api.zapi.ink/v1/bypass-tools:tinyurl/resolve",
  },
];

// Fallback jika tidak ada yang cocok -> coba generic resolver
const GENERIC_URL = "https://api.zapi.ink/v1/bypass-tools:generic/resolve";

// ============================================================
// Status / pesan yang dianggap "kuota habis" -> pindah key
// ============================================================
const isExhausted = (status, raw) =>
  [401, 402, 403, 429].includes(status) ||
  /limit|quota|kuota|habis|exceed|insufficient|credit/i.test(raw);

// ============================================================
// Handler utama
// ============================================================
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetLink = (body.url || "").trim();

    if (!targetLink) {
      return Response.json({ success: false, message: "URL kosong" }, { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetLink);
    } catch {
      return Response.json({ success: false, message: "Format URL tidak valid" }, { status: 400 });
    }

    // Pilih resolver berdasarkan domain URL
    const resolver = RESOLVERS.find((r) => r.pattern.test(parsedUrl.hostname + parsedUrl.href));
    const resolverUrl = resolver?.url ?? GENERIC_URL;
    const resolverName = resolver?.name ?? "Generic";

    // Kumpulkan API key (urut: KEY_1, KEY_2, KEY_3, KEY)
    const apiKeys = [
      process.env.ZAPI_KEY_1,
      process.env.ZAPI_KEY_2,
      process.env.ZAPI_KEY_3,
      process.env.ZAPI_KEY,
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      return Response.json(
        { success: false, message: "API Key belum diatur di Vercel!" },
        { status: 500 }
      );
    }

    let last = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];

      let response, rawText;
      try {
        response = await fetch(resolverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "x-api-key": apiKey,
          },
          body: JSON.stringify({ url: targetLink }),
          signal: AbortSignal.timeout(25000),
        });
        rawText = await response.text();
      } catch (err) {
        last = {
          success: false,
          status: 502,
          data: err.message,
          keyUsed: i + 1,
          resolver: resolverName,
        };
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      last = {
        success: response.ok,
        status: response.status,
        data,
        keyUsed: i + 1,
        resolver: resolverName,
      };

      // Sukses, atau error bukan karena kuota -> berhenti
      if (response.ok || !isExhausted(response.status, rawText)) {
        return Response.json(last);
      }
      // Kuota habis -> coba key berikutnya
    }

    return Response.json(
      {
        ...last,
        message: "Semua API key habis atau terkena limit",
        resolver: resolverName,
      },
      { status: last?.status || 429 }
    );
  } catch (error) {
    return Response.json({ success: false, errorDetail: error.message }, { status: 500 });
  }
}
