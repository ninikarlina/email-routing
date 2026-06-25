// ============================================================
// SIMULASI LOKAL - Email Parser PAKAI postal-mime
// Jalankan: node test-simulate.mjs
// ============================================================

import PostalMime from "postal-mime";

// ── Fungsi parser (identik dengan receive-email.js) ──────────
async function parseEmail(rawEmail) {
    const parsed = await PostalMime.parse(rawEmail);

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

    return bodyText.substring(0, 1000);
}

// ─── Contoh Email Palsu (Simulasi) ───────────────────────────

// Helper membuat raw email dengan CRLF (\r\n) yang benar
const CRLF = "\r\n";

// ─── TEST 1: Email ChatGPT (multipart/alternative, QP encoded) ───
const emailChatGPT = [
    `MIME-Version: 1.0`,
    `From: noreply@openai.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Your temporary ChatGPT verification code`,
    `Content-Type: multipart/alternative; boundary="----=_Part_ChatGPT_001"`,
    ``,
    `------=_Part_ChatGPT_001`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `Your temporary ChatGPT verification code`,
    ``,
    `Use code below to verify your account:`,
    ``,
    `  836 291`,
    ``,
    `This code expires in 15 minutes. Do not share this code.`,
    ``,
    `------=_Part_ChatGPT_001`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<!DOCTYPE html><html><head><style>`,
    `@font-face { font-family: "Sohne"; src: url(https://cdn.openai.com/fonts/soehne.woff2); }`,
    `body { font-family: Sohne, Arial; background: #fff; }`,
    `</style></head>`,
    `<body><p>Your temporary ChatGPT verification code</p>`,
    `<h1>836 291</h1>`,
    `<p>This code expires in 15 minutes.</p></body></html>`,
    ``,
    `------=_Part_ChatGPT_001--`,
].join(CRLF);

// ─── TEST 2: Email DeepSeek (multipart/mixed → multipart/alternative) ───
const emailDeepSeek = [
    `MIME-Version: 1.0`,
    `From: no-reply@deepseek.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: DeepSeek - Verification Code`,
    `Content-Type: multipart/mixed; boundary="MIXED_BOUNDARY_DS_123"`,
    ``,
    `--MIXED_BOUNDARY_DS_123`,
    `Content-Type: multipart/alternative; boundary="ALT_BOUNDARY_DS_456"`,
    ``,
    `--ALT_BOUNDARY_DS_456`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    `Hi there,`,
    ``,
    `Your DeepSeek verification code is: 749201`,
    ``,
    `This code will expire in 10 minutes.`,
    `If you did not request this, please ignore this email.`,
    ``,
    `- The DeepSeek Team`,
    ``,
    `--ALT_BOUNDARY_DS_456`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    `<html><head><style>body{font-family:Arial;}</style></head>`,
    `<body><p>Your verification code: <b>749201</b></p></body></html>`,
    ``,
    `--ALT_BOUNDARY_DS_456--`,
    ``,
    `--MIXED_BOUNDARY_DS_123--`,
].join(CRLF);

// ─── TEST 3: Email plain text biasa (tanpa multipart) ───
const emailPlainOnly = [
    `MIME-Version: 1.0`,
    `From: support@github.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Reset your GitHub password`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    `Hey there!`,
    ``,
    `Someone requested a password reset for your GitHub account.`,
    `Click the link below to reset your password:`,
    ``,
    `  https://github.com/password_reset?token=abc123xyz`,
    ``,
    `This link expires in 1 hour. If you didn't request this, ignore this email.`,
    ``,
    `GitHub Security`,
].join(CRLF);

// ─── TEST 4: Email HTML-only (tidak ada text/plain — pakai fallback) ───
const emailHtmlOnly = [
    `MIME-Version: 1.0`,
    `From: verify@google.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Google verification code`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<!DOCTYPE html>`,
    `<html><head>`,
    `<style>`,
    `  body { font-family: Arial, sans-serif; color: #333; }`,
    `  .code { font-size: 36px; font-weight: bold; color: #4285F4; }`,
    `  .footer { color: #999; font-size: 12px; }`,
    `</style>`,
    `</head><body>`,
    `<p>G-<span class=3D"code">482917</span> is your Google verification code.</p>`,
    `<p class=3D"footer">Don=E2=80=99t share this code with anyone.</p>`,
    `</body></html>`,
].join(CRLF);

// ─── TEST 5: onlinesim.io (HTML-only + Quoted-Printable + CSS berat) ───
// Ini adalah pola email yang GAGAL di versi lama:
// CSS dari <style> bocor karena QP decode belum jalan sebelum strip style.
const emailOnlinesim = [
    `MIME-Version: 1.0`,
    `From: 010e019efe5c7ba4-9904cd9b-8753-4bed-9bf9-2edfe03d6bbf-000000@email.onlinesim.io`,
    `To: bahagia@uniramalang.eu.cc`,
    `Subject: Email confirmation on onlinesim.io`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    // HTML-only email dengan CSS berat (pola Stripo/Elastic Email)
    // QP soft wrap: baris diakhiri =\r\n lalu disambung
    `<!DOCTYPE html>`,
    `<html><head>`,
    `<style>`,
    // Contoh QP soft wrap: kata panjang dipotong dengan = di ujung baris
    `a {=`,
    `text-decoration: none;=`,
    `}`,
    `sup {`,
    `font-size: 100% !important;=`,
    `}`,
    `#outlook a {`,
    `padding: 0;=`,
    `}`,
    `.es-button {`,
    `mso-style-priority: 100 !important;=`,
    `text-decoration: none !important;=`,
    `}`,
    `a[x-apple-data-detectors] {`,
    `color: inherit !important;=`,
    `text-decoration: none !important;=`,
    `}`,
    `@media only screen and (max-width: 600px) {=`,
    `p, ul li, ol li, a {=`,
    `line-height: 150% !important=`,
    `}`,
    `h1 {`,
    `font-size: 36px !important;=`,
    `text-align: left=`,
    `}`,
    `}`,
    `</style>`,
    `</head><body>`,
    `<table width=3D"100%"><tr><td>`,
    `<p style=3D"font-family:Arial">Please confirm your email address.</p>`,
    `<p style=3D"font-family:Arial">Your confirmation code:</p>`,
    `<h1 style=3D"font-size:48px;color:#000;letter-spacing:8px">96</h1>`,
    `<p style=3D"font-size:12px;color:#888">This code expires in 30 minut=`,
    `es. If you didn=E2=80=99t request this, ignore this email.</p>`,
    `</td></tr></table>`,
    `</body></html>`,
].join(CRLF);

// ─── Jalankan semua test ─────────────────────────────────────
const tests = [
    {
        name: "TEST 1 — ChatGPT OTP (multipart/alternative + QP)",
        from: "noreply@openai.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Your temporary ChatGPT verification code",
        raw: emailChatGPT,
    },
    {
        name: "TEST 2 — DeepSeek OTP (multipart/mixed nested)",
        from: "no-reply@deepseek.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "DeepSeek - Verification Code",
        raw: emailDeepSeek,
    },
    {
        name: "TEST 3 — GitHub Reset Password (plain text only)",
        from: "support@github.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Reset your GitHub password",
        raw: emailPlainOnly,
    },
    {
        name: "TEST 4 — Google OTP (HTML-only, fallback mode)",
        from: "verify@google.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Google verification code",
        raw: emailHtmlOnly,
    },
    {
        name: "TEST 5 — onlinesim.io (HTML-only + QP + CSS berat)",
        from: "010e019efe5c7ba4-9904cd9b@email.onlinesim.io",
        to: "bahagia@uniramalang.eu.cc",
        subject: "Email confirmation on onlinesim.io",
        raw: emailOnlinesim,
        // Kode OTP yang harus ditemukan
        expectedOtp: "96",
    },
];

console.log("=".repeat(60));
console.log("   SIMULASI EMAIL PARSER — PAKAI postal-mime");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

// Harus async karena PostalMime.parse() adalah Promise
(async () => {
    for (const t of tests) {
        const result = await parseEmail(t.raw);
        const hasCss = /(@font-face|font-family\s*:|text-decoration\s*:|mso-style|ExternalClass|\.es-button|@media\s+only)/i.test(result);
        const hasHtmlTag = /<[a-z][\s\S]*?>/i.test(result);
        const hasQpLeak = /=[A-F0-9]{2}(?!\w)/i.test(result) || /=\r?\n/.test(result);
        const otpFound = t.expectedOtp ? result.includes(t.expectedOtp) : true;
        const ok = !hasCss && !hasHtmlTag && !hasQpLeak && otpFound && result.trim().length > 0;

        console.log("\n" + "─".repeat(60));
        console.log(`📧  ${t.name}`);
        console.log(`🎯  Tujuan : ${t.to}`);
        console.log(`👤  Dari   : ${t.from}`);
        console.log(`📌  Subjek : ${t.subject}`);
        console.log(`\n📝  Hasil Parsing:\n`);
        console.log(result);
        console.log("\n" + (ok ? "✅  LULUS — Output bersih, OTP terbaca" : "❌  GAGAL!"));

        if (ok) passed++;
        else {
            failed++;
            if (hasCss)     console.log("   ⚠️  Terdeteksi: CSS masih bocor ke output");
            if (hasHtmlTag) console.log("   ⚠️  Terdeteksi: Tag HTML dalam output");
            if (hasQpLeak)  console.log("   ⚠️  Terdeteksi: Sisa karakter QP (=XX atau = di ujung baris)");
            if (!otpFound)  console.log(`   ⚠️  OTP '${t.expectedOtp}' tidak ditemukan dalam output`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊  HASIL: ${passed} lulus, ${failed} gagal dari ${tests.length} test`);
    console.log("=".repeat(60) + "\n");

    if (failed === 0) {
        console.log("🚀  Semua test lulus! Aman untuk deploy ke Cloudflare.\n");
    } else {
        console.log("🛑  Ada test yang gagal. Periksa kembali sebelum deploy.\n");
    }
})();
