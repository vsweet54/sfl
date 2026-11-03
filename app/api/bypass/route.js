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

    // Mengambil API Key dari Environment Variable Vercel
    const apiKey = process.env.ZAPI_KEY;

    if (!apiKey) {
      return Response.json(
        { success: false, message: "API Key belum diatur di Vercel" },
        { status: 500 }
      );
    }

    // Tembak ke endpoint bypasser zapi.ink
    const targetUrl = `https://zapi.ink/api/tools/bypass?apikey=${apiKey}&url=${encodeURIComponent(targetLink)}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { success: false, message: "Gagal terhubung ke server bypass", error: error.message },
      { status: 500 }
    );
  }
}

