// ============================================================
// SIMULASI LOKAL - Email Parser + OTP Extractor (postal-mime)
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

        // ── Selamatkan URL dari href SEBELUM strip tag ──
        html = html.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi, (_, href) => {
            if (href.startsWith('http') && href.length > 20) return ` ${href} `;
            return " ";
        });

        html = html.replace(/<[^>]+>/g, " ");
        html = html.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');

        // ── PERBAIKAN SPASI: trim per baris + hapus blank lines berulang ──
        const lines = html.split("\n")
            .map(l => l.trim())
            .filter((l, i, arr) => {
                if (l === "" && (i === 0 || arr[i - 1] === "")) return false;
                return true;
            });
        bodyText = lines.join("\n").trim();
    }

    return { bodyText: bodyText.substring(0, 800), parsed };
}

// ── OTP Extractor — 4 strategi seperti Gmail ─────────────────
function extractOtp(text, subject = "") {
    const keywordPatterns = [
        // "code: 123456" / "kode: 123 456" / "OTP: 123456" / "code is: 123456"
        /(?:code|kode|otp|pin|token|password sementara|verification|verifikasi|confirmation|konfirmasi|security code|passcode)\s+(?:is\s*)?[:\-–]?\s*([0-9][\d\s]{3,9}\d)/i,
        // "123456 is your code" / "123456 adalah kode"
        /\b([\d][\d\s]{3,9}\d)\s+(?:is\s+your|adalah|merupakan)?\s*(?:code|kode|otp|pin|token|verification)/i,
        // "use code 123456" / "enter 123456"
        /(?:use|enter|input|masukkan|gunakan)\s+(?:code\s+|kode\s+)?([0-9][\d\s]{3,9}\d)/i,
        // "Your X code is: 123456" (umum di Google, Microsoft)
        /your\s+\w+\s+(?:code|otp|pin)\s+is\s*:?\s*([0-9][\d\s]{3,9}\d)/i,
        // "G-482917" / "G-XXXXXX" (Google style)
        /\bG-([0-9]{6})\b/i,
    ];
    for (const pattern of keywordPatterns) {
        const match = text.match(pattern);
        if (match) {
            const cleaned = match[1].replace(/\s/g, "");
            if (/^\d{4,8}$/.test(cleaned)) return cleaned;
        }
    }
    const lines = text.split(/\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        const standalone = trimmed.match(/^([\d]{3,4}\s[\d]{3,4}|[\d]{4,8})$/);
        if (standalone) {
            const cleaned = standalone[1].replace(/\s/g, "");
            if (/^\d{4,8}$/.test(cleaned)) return cleaned;
        }
    }
    const subjectMatch = subject.match(/\b(\d{4,8})\b/);
    if (subjectMatch) return subjectMatch[1];

    // Strategi 4: URL dengan keyword verifikasi/reset
    const linkMatch = text.match(
        /https?:\/\/[^\s]+(?:verif|confirm|activat|reset|token|magic|click|auth|signup|register|validat|rp[=&]|password|account\/confirm|email\/confirm)[^\s]*/i
    );
    if (linkMatch) return linkMatch[0];

    // Strategi 5: URL panjang standalone di baris sendiri = kemungkinan magic link
    for (const line of text.split(/\n/)) {
        const trimmed = line.trim();
        if (/^https?:\/\/.{40,}/.test(trimmed)) {
            return trimmed;
        }
    }

    return null;
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

// ─── TEST 3: Email  text biasa (tanpa multipart) ───
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

// ─── TEST 6: Twitter/X OTP (multipart/alternative, Base64 body) ───
const emailTwitter = [
    `MIME-Version: 1.0`,
    `From: info@twitter.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Your Twitter confirmation code is 592841`,
    `Content-Type: multipart/alternative; boundary="mimepart_twitter_001"`,
    ``,
    `--mimepart_twitter_001`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    // "Confirm your Twitter account\n\nYour confirmation code: 592841\n\nEnter this code in the app to verify your account.\nThis code expires in 30 minutes.\n\nThanks,\nThe Twitter team"
    `Q29uZmlybSB5b3VyIFR3aXR0ZXIgYWNjb3VudAoKWW91ciBjb25maXJtYXRpb24gY29kZTogNTky`,
    `ODQxCgpFbnRlciB0aGlzIGNvZGUgaW4gdGhlIGFwcCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LgpU`,
    `aGlzIGNvZGUgZXhwaXJlcyBpbiAzMCBtaW51dGVzLgoKVGhhbmtzLApUaGUgVHdpdHRlciB0ZWFt`,
    ``,
    `--mimepart_twitter_001`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<html><head><style>body{font-family:Helvetica,Arial;background:#fff;}</style></head>`,
    `<body><h2>Confirm your Twitter account</h2>`,
    `<p>Your confirmation code: <strong>592841</strong></p>`,
    `<p>Enter this code in the app to verify your account.</p>`,
    `<p>This code expires in 30 minutes.</p>`,
    `<p>Thanks,<br>The Twitter team</p></body></html>`,
    ``,
    `--mimepart_twitter_001--`,
].join(CRLF);

// ─── TEST 7: Microsoft/Outlook OTP (folded headers + QP) ───
const emailMicrosoft = [
    `MIME-Version: 1.0`,
    `From: account-security-noreply@accountprotection.microsoft.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Microsoft account security code`,
    `Content-Type: multipart/alternative;`,
    `\tboundary="_000_MS_BOUNDARY_007_"`,
    ``,
    `--_000_MS_BOUNDARY_007_`,
    `Content-Type: text/plain; charset="iso-8859-1"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `Microsoft account`,
    ``,
    `Security code`,
    ``,
    `Please use the following security code for the Microsoft account`,
    `jaranggoyang@uniramalang.eu.cc.`,
    ``,
    `Security code: 7823461`,
    ``,
    `If you didn=92t request this code, you can safely ignore this email.`,
    `Someone else might have typed your email address by mistake.`,
    ``,
    `Thanks,`,
    `The Microsoft account team`,
    ``,
    `--_000_MS_BOUNDARY_007_`,
    `Content-Type: text/html; charset="iso-8859-1"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<html><head><style>body{font-family:Calibri,Arial;}</style></head>`,
    `<body><h1>Microsoft account</h1><h2>Security code</h2>`,
    `<p>Security code: <b>7823461</b></p>`,
    `<p>Thanks, The Microsoft account team</p>`,
    `</body></html>`,
    ``,
    `--_000_MS_BOUNDARY_007_--`,
].join(CRLF);

// ─── TEST 8: Amazon OTP (multipart/mixed > multipart/alternative) ───
const emailAmazon = [
    `MIME-Version: 1.0`,
    `From: no-reply@amazon.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Amazon - One Time Password`,
    `Content-Type: multipart/mixed; boundary="AMAZON_MIXED_OUTER_001"`,
    ``,
    `--AMAZON_MIXED_OUTER_001`,
    `Content-Type: multipart/alternative; boundary="AMAZON_ALT_INNER_002"`,
    ``,
    `--AMAZON_ALT_INNER_002`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    `Hello,`,
    ``,
    `Your One Time Password (OTP) for Amazon sign-in is:`,
    ``,
    `    384720`,
    ``,
    `This OTP is valid for 3 minutes. Please do not share this code`,
    `with anyone, including Amazon employees.`,
    ``,
    `If you did not request this OTP, please contact Amazon Customer`,
    `Service immediately.`,
    ``,
    `Thank you,`,
    `Amazon`,
    ``,
    `--AMAZON_ALT_INNER_002`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    `<html><head><style>body{font-family:Amazon Ember,Arial;}</style></head>`,
    `<body><h2>Amazon One Time Password</h2>`,
    `<p style="font-size:40px;font-weight:bold;letter-spacing:4px">384720</p>`,
    `<p>Valid for 3 minutes. Do not share with anyone.</p>`,
    `</body></html>`,
    ``,
    `--AMAZON_ALT_INNER_002--`,
    ``,
    `--AMAZON_MIXED_OUTER_001--`,
].join(CRLF);

// ─── TEST 9: Binance OTP (HTML-only, pola tabel kompleks, QP) ───
const emailBinance = [
    `MIME-Version: 1.0`,
    `From: do-not-reply@post.binance.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: [Binance] Verification Code`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"`,
    `"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`,
    `<html xmlns=3D"http://www.w3.org/1999/xhtml"><head>`,
    `<meta http-equiv=3D"Content-Type" content=3D"text/html; charset=3DUTF-8">`,
    `<title>Binance Verification Code</title>`,
    `<style type=3D"text/css">`,
    `body { margin: 0; padding: 0; background-color: #F8F8F8; }`,
    `table { border-spacing: 0; }`,
    `td { padding: 0; }`,
    `.wrapper { width: 100%; background-color: #F8F8F8; }`,
    `.header { background-color: #F0B90B; padding: 20px; }`,
    `.code-box { background: #FFF9E6; border: 2px solid #F0B90B; =`,
    `border-radius: 8px; padding: 20px; text-align: center; }`,
    `.code { font-size: 48px; font-weight: bold; color: #1E2026; =`,
    `letter-spacing: 8px; }`,
    `.footer { color: #848E9C; font-size: 12px; }`,
    `</style></head>`,
    `<body>`,
    `<table class=3D"wrapper" cellpadding=3D"0" cellspacing=3D"0">`,
    `<tr><td class=3D"header">`,
    `<img src=3D"https://bin.bnbstatic.com/static/images/common/logo.png" =`,
    `alt=3D"Binance" width=3D"120">`,
    `</td></tr>`,
    `<tr><td style=3D"padding: 30px;">`,
    `<p>Dear Binance User,</p>`,
    `<p>Your verification code for Binance account login is:</p>`,
    `<div class=3D"code-box">`,
    `<div class=3D"code">916374</div>`,
    `</div>`,
    `<p>This code is valid for <strong>10 minutes</strong>.</p>`,
    `<p class=3D"footer">If you did not initiate this request, please=`,
    ` contact our support team immediately.</p>`,
    `<p class=3D"footer">Binance Team</p>`,
    `</td></tr>`,
    `</table>`,
    `</body></html>`,
].join(CRLF);

// ─── TEST 10: Instagram (multipart + link konfirmasi panjang) ───
const emailInstagram = [
    `MIME-Version: 1.0`,
    `From: security@mail.instagram.com`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Confirm your Instagram email address`,
    `Content-Type: multipart/alternative; boundary="ig_boundary_confirm_abc"`,
    ``,
    `--ig_boundary_confirm_abc`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `Hi jaranggoyang,`,
    ``,
    `Please confirm your email address so we know this account belongs=`,
    ` to you.`,
    ``,
    `Confirm email: https://www.instagram.com/accounts/confirm_email/=`,
    `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzNDU=`,
    `2Nzg5MCIsImVtYWlsIjoiamFyYW5nZ295YW5nQHVuaXJhbWFsYW5nLmV1LmNj`,
    `IiwiZXhwIjoxNzUwMDAwMDAwfQ.signature_here/`,
    ``,
    `If you didn=E2=80=99t ask to confirm this email, you can ignore t=`,
    `his message.`,
    ``,
    `Thanks,`,
    `The Instagram Team`,
    ``,
    `--ig_boundary_confirm_abc`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<html><body style="font-family:Arial,sans-serif">`,
    `<h2>Confirm your Instagram email</h2>`,
    `<p>Hi jaranggoyang,</p>`,
    `<p>Please <a href="https://www.instagram.com/accounts/confirm_email/abc123">`,
    `confirm your email address</a> so we know this account belongs to you.</p>`,
    `<p>Thanks, The Instagram Team</p>`,
    `</body></html>`,
    ``,
    `--ig_boundary_confirm_abc--`,
].join(CRLF);

// ─── TEST 11: Grok/xAI OTP (HTML-only, CSS inline berat) ───
const emailGrok = [
    `MIME-Version: 1.0`,
    `From: noreply@x.ai`,
    `To: jaranggoyang@uniramalang.eu.cc`,
    `Subject: Your xAI verification code`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    `<!DOCTYPE html><html lang=3D"en"><head>`,
    `<meta charset=3D"UTF-8">`,
    `<meta name=3D"viewport" content=3D"width=3Ddevice-width,initial-scale=3D1">`,
    `<style>`,
    `* { box-sizing: border-box; margin: 0; padding: 0; }`,
    `body { background: #0d0d0d; color: #fff; font-family: -apple-system, =`,
    `BlinkMacSystemFont, "Segoe UI", sans-serif; }`,
    `.container { max-width: 480px; margin: 40px auto; padding: 40px; =`,
    `background: #1a1a1a; border-radius: 16px; }`,
    `.logo { font-size: 32px; font-weight: 900; margin-bottom: 32px; }`,
    `.code { font-size: 64px; font-weight: 900; letter-spacing: 12px; =`,
    `color: #fff; text-align: center; margin: 32px 0; }`,
    `.subtitle { color: #888; font-size: 14px; text-align: center; }`,
    `</style></head>`,
    `<body>`,
    `<div class=3D"container">`,
    `<div class=3D"logo">Grok</div>`,
    `<p>Your verification code for xAI / Grok:</p>`,
    `<div class=3D"code">482051</div>`,
    `<p class=3D"subtitle">This code expires in 10 minutes.<br>`,
    `Do not share this code with anyone.</p>`,
    `</div>`,
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
        expectedOtp: "96",
    },
    {
        name: "TEST 6 — Twitter/X OTP (multipart + Base64 text/plain)",
        from: "info@twitter.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Your Twitter confirmation code is 592841",
        raw: emailTwitter,
        expectedOtp: "592841",
    },
    {
        name: "TEST 7 — Microsoft OTP (folded headers + QP iso-8859-1)",
        from: "account-security-noreply@accountprotection.microsoft.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Microsoft account security code",
        raw: emailMicrosoft,
        expectedOtp: "7823461",
    },
    {
        name: "TEST 8 — Amazon OTP (multipart/mixed > multipart/alternative)",
        from: "no-reply@amazon.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Amazon - One Time Password",
        raw: emailAmazon,
        expectedOtp: "384720",
    },
    {
        name: "TEST 9 — Binance OTP (HTML-only, tabel kompleks + QP)",
        from: "do-not-reply@post.binance.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "[Binance] Verification Code",
        raw: emailBinance,
        expectedOtp: "916374",
    },
    {
        name: "TEST 10 — Instagram (multipart + link konfirmasi panjang + QP)",
        from: "security@mail.instagram.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Confirm your Instagram email address",
        raw: emailInstagram,
    },
    {
        name: "TEST 11 — Grok/xAI OTP (HTML-only, dark theme CSS inline)",
        from: "noreply@x.ai",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Your xAI verification code",
        raw: emailGrok,
        expectedOtp: "482051",
    },
    {
        name: "TEST 12 — Notion (HTML-only, link HANYA di href — KASUS BUG)",
        from: "noreply@mail.notion.so",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Please verify your Notion email",
        raw: [
            `MIME-Version: 1.0`,
            `From: noreply@mail.notion.so`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Please verify your Notion email`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<!DOCTYPE html><html><head>`,
            `<style>body{font-family:sans-serif;}.btn{background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;}</style>`,
            `</head><body>`,
            `<h2>Verify your email address</h2>`,
            `<p>Click below to verify your email and get started with Notion.</p>`,
            `<a href="https://www.notion.so/verify-email?token=eyJhbGciOiJIUzI1NiJ9.abc123.signature" class="btn">Verify Email</a>`,
            `<p style="color:#888;font-size:12px">This link expires in 24 hours.</p>`,
            `</body></html>`,
        ].join(CRLF),
        expectedLink: "notion.so",
    },
    {
        name: "TEST 13 — Shopify (HTML-only, URL total tersembunyi di href button)",
        from: "no-reply@shopify.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Confirm your account",
        raw: [
            `MIME-Version: 1.0`,
            `From: no-reply@shopify.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Confirm your account`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<!DOCTYPE html><html><body style="font-family:Arial;padding:20px">`,
            `<h1>Confirm your email</h1>`,
            `<p>Please confirm your email by clicking below.</p>`,
            `<a href="https://accounts.shopify.com/confirm?confirmation_token=abc123xyz&email=test%40example.com" style="background:#96BF48;color:#fff;padding:15px 30px;text-decoration:none;border-radius:4px">Confirm account</a>`,
            `<p>If you didn't create this account, please ignore this email.</p>`,
            `</body></html>`,
        ].join(CRLF),
        expectedLink: "shopify.com",
    },

    // ─── TEST 14: Discord (multipart/alternative + link di text/plain) ───
    {
        name: "TEST 14 — Discord (multipart + link di text/plain, bukan HTML)",
        from: "noreply@discord.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Verify your email address",
        raw: [
            `MIME-Version: 1.0`,
            `From: noreply@discord.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Verify your email address`,
            `Content-Type: multipart/alternative; boundary="discord_boundary_001"`,
            ``,
            `--discord_boundary_001`,
            `Content-Type: text/plain; charset=UTF-8`,
            ``,
            `Verify your Discord email`,
            ``,
            `Click the link below to verify your email address:`,
            `https://click.discord.com/ls/click?upn=verify&email=jaranggoyang&token=Abc123Xyz789DefGhi456JklMno`,
            ``,
            `This link expires in 24 hours.`,
            `If you didn't create a Discord account, you can safely ignore this email.`,
            ``,
            `- The Discord Team`,
            ``,
            `--discord_boundary_001`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<html><body>`,
            `<h2>Verify your email</h2>`,
            `<a href="https://click.discord.com/ls/click?upn=verify&email=jaranggoyang&token=Abc123Xyz789DefGhi456JklMno">Verify Email</a>`,
            `</body></html>`,
            ``,
            `--discord_boundary_001--`,
        ].join(CRLF),
        expectedLink: "discord.com",
    },

    // ─── TEST 15: Slack (HTML-only, QP + magic link panjang) ───
    {
        name: "TEST 15 — Slack (HTML-only, QP encoding, magic link panjang)",
        from: "no-reply@slack.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Confirm your email address",
        raw: [
            `MIME-Version: 1.0`,
            `From: no-reply@slack.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Confirm your email address`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: quoted-printable`,
            ``,
            `<!DOCTYPE html><html><head>`,
            `<meta charset=3D"UTF-8">`,
            `<style>`,
            `body { font-family: Slack-Lato, appleLogo, sans-serif; background: #f8f8f8; }`,
            `.btn { background: #4A154B; color: #fff; padding: 12px 32px; border-radius: 4px; =`,
            `text-decoration: none; font-weight: bold; }`,
            `</style></head><body>`,
            `<table width=3D"100%" cellpadding=3D"30"><tr><td>`,
            `<img src=3D"https://a.slack-edge.com/bv1-6/slack_logo.png" alt=3D"Slack" wid=`,
            `th=3D"100">`,
            `<h2>Confirm your email</h2>`,
            `<p>Please confirm your email address to start using Slack:</p>`,
            `<a href=3D"https://slack.com/account/email-confirm/=`,
            `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImphcmFuZ2dveWFuZ0B1bml=`,
            `yYW1hbGFuZy5ldS5jYyIsImV4cCI6MTc1MjAwMDAwMH0.slackSig123" class=3D"btn">=`,
            `Confirm Email</a>`,
            `<p style=3D"color:#888;font-size:12px">This link will expire in 24 hours.</p>`,
            `</td></tr></table>`,
            `</body></html>`,
        ].join(CRLF),
        expectedLink: "slack.com",
    },

    // ─── TEST 16: Figma (HTML-only, link konfirmasi di anchor) ───
    {
        name: "TEST 16 — Figma (HTML-only, link di anchor, no numeric OTP)",
        from: "noreply@figma.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Confirm your Figma account",
        raw: [
            `MIME-Version: 1.0`,
            `From: noreply@figma.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Confirm your Figma account`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<!DOCTYPE html><html><body style="font-family:Inter,Arial;background:#1e1e1e;color:#fff;padding:40px">`,
            `<h1 style="color:#f24e1e">Figma</h1>`,
            `<h2>Confirm your account</h2>`,
            `<p>Click the link below to confirm your Figma account:</p>`,
            `<a href="https://www.figma.com/auth/confirm?token=FigmaToken_AbCdEfGhIjKlMnOpQrStUv_1234567890&source=email_confirm" style="background:#f24e1e;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block">Confirm Account</a>`,
            `<p style="color:#999;font-size:13px;margin-top:24px">If you didn't create a Figma account, please ignore this email.</p>`,
            `</body></html>`,
        ].join(CRLF),
        expectedLink: "figma.com",
    },

    // ─── TEST 17: LinkedIn (multipart, QP, link di text/plain) ───
    {
        name: "TEST 17 — LinkedIn (multipart/alternative, QP, link di text/plain)",
        from: "messages-noreply@linkedin.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Please verify your email address",
        raw: [
            `MIME-Version: 1.0`,
            `From: messages-noreply@linkedin.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Please verify your email address`,
            `Content-Type: multipart/alternative; boundary="li_boundary_verify_001"`,
            ``,
            `--li_boundary_verify_001`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: quoted-printable`,
            ``,
            `Hi jaranggoyang,`,
            ``,
            `Please verify your email address by clicking the link below:`,
            ``,
            `https://www.linkedin.com/uas/email-api/verifyEmail?tok=3DAQGPxyz123AbcDefGh=`,
            `iJklMnoPqrStuVwxYz1234567890abcdefghijklmnopqrstuvwxyz&trk=3Deml_verify_ema=`,
            `il`,
            ``,
            `This link expires in 3 days.`,
            ``,
            `The LinkedIn Team`,
            ``,
            `--li_boundary_verify_001`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<html><body><p>Please <a href="https://www.linkedin.com/uas/email-api/verifyEmail?tok=AQGPxyz123">verify your email</a>.</p></body></html>`,
            ``,
            `--li_boundary_verify_001--`,
        ].join(CRLF),
        expectedLink: "linkedin.com",
    },

    // ─── TEST 18: Zoom (HTML-only, activate account link) ───
    {
        name: "TEST 18 — Zoom (HTML-only, activate account link)",
        from: "no-reply@zoom.us",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "Please activate your Zoom account",
        raw: [
            `MIME-Version: 1.0`,
            `From: no-reply@zoom.us`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: Please activate your Zoom account`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: quoted-printable`,
            ``,
            `<!DOCTYPE html><html><head><style>`,
            `body { font-family: Arial, sans-serif; background: #f3f3f3; }`,
            `.container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; }`,
            `.btn { background: #2D8CFF; color: #fff; padding: 14px 32px; =`,
            `text-decoration: none; border-radius: 4px; font-size: 16px; }`,
            `</style></head><body>`,
            `<div class=3D"container">`,
            `<img src=3D"https://d24cgw3uvb9a9h.cloudfront.net/static/94115/image/new/ZoomLogo.png" =`,
            `alt=3D"Zoom" width=3D"120">`,
            `<h2>Activate your Zoom account</h2>`,
            `<p>Hi jaranggoyang,</p>`,
            `<p>An account has been created for you. Please activate your account by clicking=`,
            ` the button below:</p>`,
            `<a href=3D"https://zoom.us/activate?code=3DzoomActivate_AbcDef123GhiJkl456=`,
            `MnoPqr789StuVwx012&source=3Demail" class=3D"btn">Activate Account</a>`,
            `<p style=3D"color:#999;font-size:12px">This link expires in 24 hours.</p>`,
            `</div></body></html>`,
        ].join(CRLF),
        expectedLink: "zoom.us",
    },

    // ─── TEST 19: WordPress (reset password, link di text/plain) ───
    {
        name: "TEST 19 — WordPress (reset password, plain text + HTML, link panjang)",
        from: "wordpress@yourdomain.com",
        to: "jaranggoyang@uniramalang.eu.cc",
        subject: "[Your Site] Password Reset",
        raw: [
            `MIME-Version: 1.0`,
            `From: wordpress@yourdomain.com`,
            `To: jaranggoyang@uniramalang.eu.cc`,
            `Subject: [Your Site] Password Reset`,
            `Content-Type: multipart/alternative; boundary="wp_boundary_reset"`,
            ``,
            `--wp_boundary_reset`,
            `Content-Type: text/plain; charset=UTF-8`,
            ``,
            `Someone has requested a password reset for the following account:`,
            ``,
            `Site Name: Your Site`,
            `Username: jaranggoyang`,
            ``,
            `If this was a mistake, ignore this email and nothing will happen.`,
            ``,
            `To reset your password, visit the following address:`,
            ``,
            `https://yoursite.com/wp-login.php?action=rp&key=AbcDefGhiJklMno123456&login=jaranggoyang&wp_lang=id_ID`,
            ``,
            `This link will expire in 24 hours.`,
            ``,
            `--wp_boundary_reset`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<html><body>`,
            `<p>Someone has requested a password reset for:</p>`,
            `<p><strong>Username:</strong> jaranggoyang</p>`,
            `<p><a href="https://yoursite.com/wp-login.php?action=rp&key=AbcDefGhiJklMno123456&login=jaranggoyang">Reset Password</a></p>`,
            `</body></html>`,
            ``,
            `--wp_boundary_reset--`,
        ].join(CRLF),
        expectedLink: "yoursite.com",
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
        const { bodyText, parsed } = await parseEmail(t.raw);
        const result = bodyText;
        const subject = parsed.subject || t.subject || "";

        // ── Validasi output bersih ────────────────────────────────
        const hasCss = /(@font-face|font-family\s*:|text-decoration\s*:|mso-style|ExternalClass|\.es-button|@media\s+only)/i.test(result);
        const hasHtmlTag = /<[a-z][\s\S]*?>/i.test(result);
        const hasQpLeak = /=[A-F0-9]{2}(?!\w)/i.test(result) || /=\r?\n/.test(result);

        // ── Coba ekstrak OTP/Link ─────────────────────────────────
        const detectedOtp = extractOtp(result, subject);

        const otpFound  = t.expectedOtp  ? result.includes(t.expectedOtp)           : true;
        const linkFound = t.expectedLink ? (detectedOtp || "").includes(t.expectedLink) : true;
        const ok = !hasCss && !hasHtmlTag && !hasQpLeak && otpFound && linkFound && result.trim().length > 0;

        console.log("\n" + "─".repeat(60));
        console.log(`📧  ${t.name}`);
        console.log(`🎯  Tujuan : ${t.to}`);
        console.log(`👤  Dari   : ${t.from}`);
        console.log(`📌  Subjek : ${t.subject}`);
        console.log(`\n📝  Body Parsing:\n`);
        console.log(result.substring(0, 300) + (result.length > 300 ? "\n..." : ""));

        // Tampilkan hasil OTP/link detection
        if (detectedOtp) {
            if (detectedOtp.startsWith("http")) {
                console.log(`\n🔗  Link Verifikasi (auto-detected):\n   ${detectedOtp.substring(0, 90)}...`);
            } else {
                console.log(`\n🔑  OTP Terdeteksi: ┌──────────────┐`);
                console.log(`                   │  ${detectedOtp.padEnd(12)}│`);
                console.log(`                   └──────────────┘`);
            }
        } else {
            console.log(`\n🔍  OTP/Link: tidak terdeteksi otomatis`);
        }

        console.log("\n" + (ok ? "✅  LULUS — Output bersih, OTP/Link terbaca" : "❌  GAGAL!"));

        if (ok) passed++;
        else {
            failed++;
            if (hasCss)      console.log("   ⚠️  Terdeteksi: CSS masih bocor ke output");
            if (hasHtmlTag)  console.log("   ⚠️  Terdeteksi: Tag HTML dalam output");
            if (hasQpLeak)   console.log("   ⚠️  Terdeteksi: Sisa karakter QP (=XX atau = di ujung baris)");
            if (!otpFound)   console.log(`   ⚠️  OTP '${t.expectedOtp}' tidak ditemukan dalam output`);
            if (!linkFound)  console.log(`   ⚠️  Link '${t.expectedLink}' tidak terdeteksi oleh extractOtp`);
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

