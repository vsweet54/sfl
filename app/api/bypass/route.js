export const maxDuration = 30;

const TARGET_URL = "https://api.zapi.ink/v1/bypass-tools:safelinku/resolve";

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

    // Urutan: KEY_1, KEY_2, KEY_3, lalu KEY
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
        response = await fetch(TARGET_URL, {
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
        // Gagal koneksi / timeout -> coba key berikutnya
        last = { success: false, status: 502, data: err.message, keyUsed: i + 1 };
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      last = { success: response.ok, status: response.status, data, keyUsed: i + 1 };

      // Sukses, atau error biasa (bukan kuota) -> berhenti
      if (response.ok || !isExhausted(response.status, rawText)) {
        return Response.json(last);
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
