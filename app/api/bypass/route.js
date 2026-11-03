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

    // Daftar kunci Zapi cadangan
    const keys = [process.env.ZAPI_KEY_1, process.env.ZAPI_KEY_2].filter(Boolean);

    let lastError = null;

    // Coba kunci 1, jika habis/gagal otomatis coba kunci 2
    for (const apiKey of keys) {
      try {
        const targetUrl = `https://zapi.ink/api/tools/bypass?apikey=${apiKey}&url=${encodeURIComponent(targetLink)}`;
        const response = await fetch(targetUrl);
        const data = await response.json();

        // Jika berhasil mendapatkan respon valid dari Zapi
        if (response.ok && data.status !== false && !data.error) {
          return Response.json(data);
        }

        lastError = data;
      } catch (err) {
        lastError = err.message;
      }
    }

    // Jika kedua kunci gagal atau kuota sama-sama habis
    return Response.json(
      { success: false, message: "Semua kuota API Zapi habis atau gagal diproses", detail: lastError },
      { status: 429 }
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "Terjadi kesalahan server", error: error.message },
      { status: 500 }
    );
  }
}
