import PostalMime from "postal-mime";

// ╔══════════════════════════════════════════════════════════╗
// ║              KONFIGURASI FALLBACK (LOKAL)               ║
// ║  Dipakai saat testing lokal / jika env belum diset      ║
// ║  Untuk PRODUCTION → isi via Cloudflare Dashboard:       ║
// ║  Workers → Settings → Variables & Secrets               ║
// ╚══════════════════════════════════════════════════════════╝

const CONFIG = {
    // Token bot Telegram (dari @BotFather)
    TELEGRAM_BOT_TOKEN: "ISI_BOT_TOKEN_ANDA_DISINI",

    // Chat ID Telegram tujuan notifikasi (dari @userinfobot)
    TELEGRAM_CHAT_ID: "ISI_CHAT_ID_ANDA_DISINI",
};

// ═══════════════════════════════════════════════════════════

export default {
    async email(message, env, ctx) {
        // Prioritas: ambil dari Cloudflare Dashboard dulu, fallback ke CONFIG
        const botToken = env.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN;
        const chatId   = env.TELEGRAM_CHAT_ID   || CONFIG.TELEGRAM_CHAT_ID;

        const from = message.from;
        const to = message.to;
        const subject = message.headers.get("subject") || "(Tanpa Subjek)";

        // ── Parse email dengan postal-mime ───────────────────────
        // postal-mime menangani semua MIME secara otomatis:
        // multipart, QP, Base64, charset encoding, nested parts, dll.
        const rawEmail = await new Response(message.raw).text();
        const parsed = await PostalMime.parse(rawEmail);

        // Prioritas: text/plain → strip HTML dari text/html → kosong
        let bodyText = "";

        if (parsed.text && parsed.text.trim()) {
            // Ada versi plain text → langsung pakai
            bodyText = parsed.text.trim();
        } else if (parsed.html && parsed.html.trim()) {
            // Hanya ada HTML → strip tag & CSS, ambil teksnya
            let html = parsed.html;
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            html = html.replace(/<[^>]+>/g, " ");
            html = html.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
                .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');
            bodyText = html.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        }

        // Batasi 1000 karakter agar Telegram tidak menolak
        const bodyPreview = bodyText.substring(0, 1000);

        const textMsg = `📧 Email Baru Masuk!\n\n🎯 Tujuan: ${to}\n👤 Dari: ${from}\n📌 Subjek: ${subject}\n\n📝 Isi Pesan:\n${bodyPreview}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: textMsg }),
        });
    },

    // FUNGSI WEB DASHBOARD
    async fetch(request, env, ctx) {
        const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mail Server | KKN-T 02 UNIRA 2026</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #008080, #FFD700, #008000); 
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          text-align: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        h1 { margin-bottom: 10px; font-weight: bold; }
        p { font-size: 1.2rem; }
        .footer { font-style: italic; opacity: 0.9; font-size: 0.9rem; margin-top: 25px; font-weight: 500;}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sistem Mail Aktif 🚀</h1>
        <p>Server penerima OTP berjalan dengan tangguh.</p>
        <div class="footer">Desa Srigonco Bantur</div>
      </div>
    </body>
    </html>
    `;

        return new Response(html, {
            headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
    },
};