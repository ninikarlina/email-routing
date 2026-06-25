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
// ── Ekstraksi OTP/Kode — Teknik yang sama dengan Gmail ──────
//
// Gmail menggunakan strategi berlapis untuk mendeteksi OTP:
// 1. Konteks kata kunci dekat angka  → "Your code: 382910"
// 2. Angka menonjol standalone       → "  836 291  " (terpencil)
// 3. Magic link verifikasi           → URL https://...verify...
// 4. Kode di subject email           → "Your code is 123456"
// ═══════════════════════════════════════════════════════════

function extractOtp(text, subject = "") {
    // ── Strategi 1: Konteks kata kunci + angka (paling akurat) ──
    // Cari pola "kata_kunci: ANGKA" atau "ANGKA adalah kata_kunci"
    const keywordPatterns = [
        // "code: 123456" / "code is: 123456" / "kode: 123456"
        /(?:code|kode|otp|pin|token|password sementara|verification|verifikasi|confirmation|konfirmasi|security code|passcode)\s+(?:is\s*)?[:\-–]?\s*([0-9][\d\s]{3,9}\d)/i,
        // "123456 is your code"
        /\b([\d][\d\s]{3,9}\d)\s+(?:is\s+your|adalah|merupakan)?\s*(?:code|kode|otp|pin|token|verification)/i,
        // "use code 123456" / "enter 123456"
        /(?:use|enter|input|masukkan|gunakan)\s+(?:code\s+|kode\s+)?([0-9][\d\s]{3,9}\d)/i,
        // "Your X code is: 123456"
        /your\s+\w+\s+(?:code|otp|pin)\s+is\s*:?\s*([0-9][\d\s]{3,9}\d)/i,
        // "G-482917" (Google style)
        /\bG-([0-9]{6})\b/i,
    ];

    for (const pattern of keywordPatterns) {
        const match = text.match(pattern);
        if (match) {
            const cleaned = match[1].replace(/\s/g, "");
            if (/^\d{4,8}$/.test(cleaned)) return cleaned;
        }
    }

    // ── Strategi 2: Angka menonjol (standalone, terpencil di baris sendiri) ──
    // Gmail mendeteksi angka 4-8 digit yang "sendirian" di baris = kemungkinan OTP
    const lines = text.split(/\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        // Hanya angka (dengan atau tanpa spasi di tengah), 4-8 digit total
        const standalone = trimmed.match(/^([\d]{3,4}\s[\d]{3,4}|[\d]{4,8})$/);
        if (standalone) {
            const cleaned = standalone[1].replace(/\s/g, "");
            if (/^\d{4,8}$/.test(cleaned)) return cleaned;
        }
    }

    // ── Strategi 3: Cari kode di subject email ──
    // Contoh: "Your code is 123456" / "[Service] Verification Code: 123456"
    const subjectMatch = subject.match(/\b(\d{4,8})\b/);
    if (subjectMatch) return subjectMatch[1];

    // ── Strategi 4: Magic link verifikasi ──
    // Jika tidak ada angka OTP, cari URL verifikasi/konfirmasi
    const linkMatch = text.match(/https?:\/\/[^\s]+(?:verif|confirm|activate|reset|token|magic)[^\s]*/i);
    if (linkMatch) return linkMatch[0];

    return null; // Tidak ditemukan
}

export default {
    async email(message, env, ctx) {
        // Prioritas: ambil dari Cloudflare Dashboard dulu, fallback ke CONFIG
        const botToken = env.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN;
        const chatId   = env.TELEGRAM_CHAT_ID   || CONFIG.TELEGRAM_CHAT_ID;

        const from = message.from;
        const to = message.to;
        const subject = message.headers.get("subject") || "(Tanpa Subjek)";

        // ── Parse email dengan postal-mime ───────────────────────
        const rawEmail = await new Response(message.raw).text();
        const parsed = await PostalMime.parse(rawEmail);

        // Prioritas: text/plain → strip HTML dari text/html → kosong
        let bodyText = "";

        if (parsed.text && parsed.text.trim()) {
            bodyText = parsed.text.trim();
        } else if (parsed.html && parsed.html.trim()) {
            let html = parsed.html;
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            html = html.replace(/<[^>]+>/g, " ");
            html = html.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
                .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');
            bodyText = html.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        }

        // ── Ekstrak OTP/Kode secara otomatis (seperti Gmail) ─────
        const otp = extractOtp(bodyText, subject);

        // Batasi 800 karakter agar Telegram tidak menolak
        const bodyPreview = bodyText.substring(0, 800);

        // Susun pesan — OTP ditampilkan menonjol jika berhasil diekstrak
        let textMsg = `📧 Email Baru Masuk!\n\n🎯 Tujuan: ${to}\n👤 Dari: ${from}\n📌 Subjek: ${subject}`;

        if (otp) {
            if (otp.startsWith("http")) {
                // Ini link verifikasi
                textMsg += `\n\n🔗 Link Verifikasi:\n${otp}`;
            } else {
                // Ini kode OTP
                textMsg += `\n\n🔑 Kode OTP:\n┌─────────────────┐\n│   ${otp.padStart(Math.ceil((17 + otp.length) / 2), " ").padEnd(17, " ")}│\n└─────────────────┘`;
            }
        }

        textMsg += `\n\n📝 Isi Pesan:\n${bodyPreview}`;

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