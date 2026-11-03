export async function POST(req) {
  try {
    const { action, payload } = await req.json();
    const zapiKey = process.env.ZAPI_KEY;
    const secondKey = process.env.SECOND_API_KEY; // API cadangan opsional

    if (!payload) {
      return Response.json(
        { success: false, message: "Payload tidak boleh kosong" },
        { status: 400 }
      );
    }

    let targetUrl = "";

    // Pemilihan API berdasarkan action dari APK
    if (action === "tiktok") {
      targetUrl = `https://zapi.ink/api/downloader/tiktok?apikey=${zapiKey}&url=${encodeURIComponent(payload)}`;
    } else if (action === "chat") {
      targetUrl = `https://zapi.ink/api/ai/chat?apikey=${zapiKey}&query=${encodeURIComponent(payload)}`;
    } else {
      return Response.json(
        { success: false, message: "Action tidak dikenal" },
        { status: 400 }
      );
    }

    const response = await fetch(targetUrl);
    const data = await response.json();

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { success: false, message: "Terjadi kesalahan sistem", error: error.message },
      { status: 500 }
    );
  }
}
