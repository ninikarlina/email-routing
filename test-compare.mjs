// ============================================================
// PERBANDINGAN: @onedaydevelopers/otp-detector vs Custom
// Jalankan: node test-compare.mjs
// ============================================================

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { extractOTP } = require('@onedaydevelopers/otp-detector');

// ── Custom extractOtp (identik dengan receive-email.js) ───────
function extractOtp(text, subject = "") {
    const keywordPatterns = [
        /(?:code|kode|otp|pin|token|password sementara|verification|verifikasi|confirmation|konfirmasi|security code|passcode)\s+(?:is\s*)?[:\-–]?\s*([0-9][\d\s]{3,9}\d)/i,
        /\b([\d][\d\s]{3,9}\d)\s+(?:is\s+your|adalah|merupakan)?\s*(?:code|kode|otp|pin|token|verification)/i,
        /(?:use|enter|input|masukkan|gunakan)\s+(?:code\s+|kode\s+)?([0-9][\d\s]{3,9}\d)/i,
        /your\s+\w+\s+(?:code|otp|pin)\s+is\s*:?\s*([0-9][\d\s]{3,9}\d)/i,
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
    const linkMatch = text.match(
        /https?:\/\/[^\s]+(?:verif|confirm|activat|reset|token|magic|click|auth|signup|register|validat|rp[=&]|password|account\/confirm|email\/confirm)[^\s]*/i
    );
    if (linkMatch) return linkMatch[0];
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^https?:\/\/.{40,}/.test(trimmed)) return trimmed;
    }
    return null;
}

// ── Test cases ─────────────────────────────────────────────────
const cases = [
    {
        label: "ChatGPT — kode spasi (836 291)",
        subject: "Your temporary ChatGPT verification code",
        text: "Your temporary ChatGPT verification code\n\nUse code below to verify your account:\n\n  836 291\n\nThis code expires in 15 minutes.",
        expected: "836291",
    },
    {
        label: "DeepSeek — 'code is: 749201'",
        subject: "DeepSeek - Verification Code",
        text: "Your DeepSeek verification code is: 749201\n\nThis code will expire in 10 minutes.",
        expected: "749201",
    },
    {
        label: "Microsoft — 'Security code: 7823461'",
        subject: "Microsoft account security code",
        text: "Microsoft account\n\nSecurity code\n\nSecurity code: 7823461\n\nIf you didn't request this, ignore this email.",
        expected: "7823461",
    },
    {
        label: "Amazon — angka standalone indent",
        subject: "Amazon - One Time Password",
        text: "Your One Time Password (OTP) for Amazon sign-in is:\n\n    384720\n\nValid for 3 minutes.",
        expected: "384720",
    },
    {
        label: "Binance — angka standalone HTML stripped",
        subject: "[Binance] Verification Code",
        text: "Dear Binance User,\n Your verification code for Binance account login is:\n\n 916374\n\n This code is valid for 10 minutes.",
        expected: "916374",
    },
    {
        label: "Google — 'G-482917' style",
        subject: "Google verification code",
        text: "G- 482917 is your Google verification code.\n Don't share this code with anyone.",
        expected: "482917",
    },
    {
        label: "Twitter — 'confirmation code: 592841'",
        subject: "Your Twitter confirmation code is 592841",
        text: "Confirm your Twitter account\n\nYour confirmation code: 592841\n\nEnter this code in the app.",
        expected: "592841",
    },
    {
        label: "Grok — angka standalone 64px",
        subject: "Your xAI verification code",
        text: "Grok\n Your verification code for xAI / Grok:\n 482051\n This code expires in 10 minutes.",
        expected: "482051",
    },
    {
        label: "onlinesim — kode 2 digit '96' (edge case)",
        subject: "Email confirmation on onlinesim.io",
        text: "Please confirm your email address.\n Your confirmation code:\n 96\n This code expires in 30 minutes.",
        expected: "96",       // kode 2 digit, di luar range 4-8
    },
    // ── Link-only cases ─────────────────────────────────────────
    {
        label: "GitHub — reset link di text/plain",
        subject: "Reset your GitHub password",
        text: "Click the link below to reset your password:\n\n  https://github.com/password_reset?token=abc123xyz\n\nThis link expires in 1 hour.",
        expected: "github.com",
        isLink: true,
    },
    {
        label: "Notion — link HANYA di href (kasus bug)",
        subject: "Please verify your Notion email",
        text: "Verify your email address\n Click below to verify your email.\n https://www.notion.so/verify-email?token=eyJhbGciOiJIUzI1NiJ9.abc123.signature \n Verify Email \n This link expires in 24 hours.",
        expected: "notion.so",
        isLink: true,
    },
    {
        label: "WordPress — reset link panjang (action=rp)",
        subject: "[Your Site] Password Reset",
        text: "To reset your password, visit the following address:\n\nhttps://yoursite.com/wp-login.php?action=rp&key=AbcDefGhiJklMno123456&login=jaranggoyang&wp_lang=id_ID\n\nThis link will expire in 24 hours.",
        expected: "yoursite.com",
        isLink: true,
    },
    {
        label: "Discord — link panjang di text/plain",
        subject: "Verify your email address",
        text: "Click the link below to verify your email address:\nhttps://click.discord.com/ls/click?upn=verify&email=jaranggoyang&token=Abc123Xyz789DefGhi456JklMno\n\nThis link expires in 24 hours.",
        expected: "discord.com",
        isLink: true,
    },
    {
        label: "Zoom — activate link (keyword: activate)",
        subject: "Please activate your Zoom account",
        text: "Please activate your account by clicking the button below:\nhttps://zoom.us/activate?code=zoomActivate_AbcDef123GhiJkl456MnoPqr789&source=email\nThis link expires in 24 hours.",
        expected: "zoom.us",
        isLink: true,
    },
    {
        label: "LinkedIn — QP-wrapped link",
        subject: "Please verify your email address",
        text: "Please verify your email address by clicking the link below:\n\nhttps://www.linkedin.com/uas/email-api/verifyEmail?tok=AQGPxyz123AbcDefGhiJklMnoPqrStuVwxYz1234567890abcdefghijklmnopqrstuvwxyz&trk=eml_verify_email\n\nThis link expires in 3 days.",
        expected: "linkedin.com",
        isLink: true,
    },
];

// ── Runner ─────────────────────────────────────────────────────
const W = 40;
let libWin = 0, custWin = 0, both = 0, neither = 0;

console.log("=".repeat(70));
console.log("   PERBANDINGAN OTP EXTRACTOR");
console.log("   Library: @onedaydevelopers/otp-detector  vs  Custom (kita)");
console.log("=".repeat(70));

for (const c of cases) {
    const libRaw  = extractOTP(c.text);
    const custRaw = extractOtp(c.text, c.subject);

    // Normalisasi untuk perbandingan
    const libResult  = libRaw  !== null ? String(libRaw)  : null;
    const custResult = custRaw !== null ? String(custRaw) : null;

    const libOk  = c.isLink
        ? (libResult  || "").includes(c.expected)
        : libResult  === c.expected;
    const custOk = c.isLink
        ? (custResult || "").includes(c.expected)
        : custResult === c.expected;

    const libStr  = libOk  ? `✅ ${(libResult  || "").substring(0, 30)}` : `❌ ${libResult  || "(null)"}`;
    const custStr = custOk ? `✅ ${(custResult || "").substring(0, 30)}` : `❌ ${custResult || "(null)"}`;

    if (libOk  && custOk)  both++;
    else if (libOk)        libWin++;
    else if (custOk)       custWin++;
    else                   neither++;

    console.log(`\n┌─ ${c.label}`);
    console.log(`│  Expected   : "${c.expected}"`);
    console.log(`│  Library    : ${libStr}`);
    console.log(`│  Custom     : ${custStr}`);
    console.log(`└${"─".repeat(60)}`);
}

console.log("\n" + "=".repeat(70));
console.log(`📊  RINGKASAN (${cases.length} kasus)`);
console.log("=".repeat(70));
console.log(`  ✅ Keduanya benar   : ${both}`);
console.log(`  🏆 Library unggul  : ${libWin}`);
console.log(`  🏆 Custom unggul   : ${custWin}`);
console.log(`  ❌ Keduanya gagal  : ${neither}`);
console.log("=".repeat(70) + "\n");
