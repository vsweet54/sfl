export async function POST(req) {
  try {
    const body = await req.json();
    const targetLink = body.url;

    if (!targetLink) {
      return Response.json({ success: false, message: "URL kosong" }, { status: 400 });
    }

    const apiKey = process.env.ZAPI_KEY_1 || process.env.ZAPI_KEY;

    if (!apiKey) {
      return Response.json({ success: false, message: "API Key belum diatur di Vercel!" }, { status: 500 });
    }

    // Endpoint asli Zapi
    const targetUrl = "https://api.zapi.ink/v1/bypass-tools:safelinku/resolve";

    // Kirim request ke Zapi
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        url: targetLink
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    return Response.json({
      success: response.ok,
      status: response.status,
      data: data
    });

  } catch (error) {
    return Response.json({ success: false, errorDetail: error.message }, { status: 500 });
  }
}
