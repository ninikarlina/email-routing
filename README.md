# 📧 Email Routing Extractor
> Cloudflare Workers untuk meneruskan email masuk (OTP, konfirmasi, dll.) ke Telegram secara otomatis.

---

## ✨ Fitur
- Parsing MIME email otomatis via **postal-mime** (multipart, QP, Base64, nested)
- Strip CSS/HTML — hanya teks bersih yang dikirim ke Telegram
- Mendukung email dari ChatGPT, DeepSeek, onlinesim.io, Google, GitHub, dll.
- Web dashboard sederhana untuk verifikasi Worker aktif

---

## 🚀 Cara Deploy

### 1. Clone & Install
```bash
git clone https://github.com/USERNAME/REPO.git
cd REPO
npm install
```

### 2. Login ke Cloudflare
```bash
npx wrangler login
```

### 3. Set Secrets (Token Telegram)
Jangan pernah taruh token langsung di kode! Gunakan perintah ini:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
# → Masukkan token bot Anda (dari @BotFather)

npx wrangler secret put TELEGRAM_CHAT_ID
# → Masukkan Chat ID Anda (dari @userinfobot)
```

### 4. Deploy
```bash
npx wrangler deploy
```

### 5. Aktifkan Email Routing di Cloudflare
Di dashboard Cloudflare → **Email** → **Email Routing** → tambahkan rule:
- **Action**: Send to Worker
- **Destination**: Worker ini

---

## 🧪 Testing Lokal (Simulasi)

Salin file `.env.example` menjadi `.dev.vars` lalu isi dengan nilai asli:
```bash
cp .env.example .dev.vars
# Edit .dev.vars dengan token asli Anda
```

Jalankan simulasi parsing email:
```bash
node test-simulate.mjs
```

---

## 📁 Struktur File

```
├── receive-email.js    # Cloudflare Worker utama
├── test-simulate.mjs   # Simulasi lokal untuk testing
├── wrangler.toml       # Konfigurasi Wrangler
├── .env.example        # Template variabel lingkungan (commit ke GitHub)
├── .dev.vars           # Secret lokal (JANGAN commit — sudah di .gitignore)
└── .gitignore
```

---

## 🔒 Keamanan

| File | Di-commit ke GitHub? | Keterangan |
|---|---|---|
| `.env.example` | ✅ Ya | Hanya template, tanpa nilai asli |
| `.dev.vars` | ❌ Tidak | Secrets lokal, di-ignore |
| `wrangler.toml` | ✅ Ya | Tidak mengandung secret |

Secrets production disimpan di **Cloudflare Workers Secrets** (terenkripsi), bukan di file.

---

## 🛠️ Update Kode

Setelah edit `receive-email.js`, deploy ulang cukup:
```bash
npx wrangler deploy
```

---

*KKN-T 02 UNIRA 2026 — Desa Srigonco Bantur*
