export async function POST(req) {
  try {
    const body = await req.json();
    const targetLink = body.url;

    if (!targetLink) {
      return Response.json(
        { success: false, message: "URL target tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Ambil kunci dari Vercel
    const keys = [
      process.env.ZAPI_KEY_1 || process.env.ZAPI_KEY,
      process.env.ZAPI_KEY_2 || process.env.SECOND_API_KEY
    ].filter(Boolean);

    if (keys.length === 0) {
      return Response.json(
        { success: false, message: "API Key belum terbaca di Vercel!" },
        { status: 500 }
      );
    }

    const apiKey = keys[0];

    // Endpoint yang ditembak
    const targetUrl = `https://zapi.ink/api/tools/bypass?apikey=${apiKey}&url=${encodeURIComponent(targetLink)}`;

    const response = await fetch(targetUrl);
    const data = await response.json();

    // Langsung teruskan apa pun balasan asli dari Zapi ke layar tester
    return Response.json({
      success: response.ok,
      statusKode: response.status,
      zapiResponse: data
    });

  } catch (error) {
    return Response.json(
      { success: false, message: "Server error", detail: error.message },
      { status: 500 }
    );
  }
}
