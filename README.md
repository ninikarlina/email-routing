# 📧 Email Routing OTP — Cloudflare Workers

Cloudflare Email Routing Worker yang meneruskan email masuk (OTP, link konfirmasi, dll.) ke Telegram secara otomatis.

Dibuat untuk kebutuhan KKN-T 02 UNIRA 2026 — Desa Srigonco Bantur.

---

## ✨ Fitur

- Parsing MIME email otomatis menggunakan **postal-mime**
- Mendukung: `multipart/alternative`, `multipart/mixed`, Quoted-Printable, Base64, nested parts
- Fallback HTML-stripping jika tidak ada versi `text/plain`
- Teks bersih dikirim ke Telegram (tanpa CSS/HTML)

---

## 🗂️ Struktur File

```
.
├── receive-email.js    # Worker utama (Cloudflare Email Handler)
├── test-simulate.mjs   # Simulasi lokal sebelum deploy
├── wrangler.toml       # Konfigurasi Cloudflare Workers
├── package.json
├── .env.example        # Contoh env vars (aman di-commit)
└── .gitignore
```

---

## 🔧 Setup Awal

### 1. Install dependencies
```bash
npm install
```

### 2. Set secrets ke Cloudflare (JANGAN hardcode di kode!)
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
# → masukkan token bot Anda, lalu Enter

wrangler secret put TELEGRAM_CHAT_ID
# → masukkan Chat ID Anda, lalu Enter
```

### 3. Untuk development lokal, buat file `.dev.vars`
```bash
# File ini sudah di .gitignore, aman untuk rahasia lokal
echo 'TELEGRAM_BOT_TOKEN=token_anda' >> .dev.vars
echo 'TELEGRAM_CHAT_ID=chat_id_anda' >> .dev.vars
```

---

## 🧪 Jalankan Simulasi Lokal

Sebelum deploy, uji parser dengan email palsu:

```bash
node test-simulate.mjs
```

Output yang diharapkan:
```
📊  HASIL: 5 lulus, 0 gagal dari 5 test
🚀  Semua test lulus! Aman untuk deploy ke Cloudflare.
```

---

## 🚀 Deploy ke Cloudflare

```bash
wrangler deploy
```

---

## ⚙️ Konfigurasi Email Routing di Cloudflare

1. Masuk ke **Cloudflare Dashboard** → pilih domain Anda
2. Buka menu **Email** → **Email Routing**
3. Aktifkan Email Routing
4. Tambah rule: `*@domain.anda` → **Send to Worker** → pilih worker ini
5. Pastikan domain MX record sudah mengarah ke Cloudflare

---

## 🔐 Keamanan

| File | Boleh di-commit? | Keterangan |
|------|:-:|---|
| `receive-email.js` | ✅ | Tidak ada rahasia |
| `wrangler.toml` | ✅ | Tidak ada rahasia |
| `.env.example` | ✅ | Hanya template kosong |
| `.dev.vars` | ❌ | Ada rahasia lokal |
| `.env` | ❌ | Ada rahasia |
| `node_modules/` | ❌ | Terlalu besar |

Bot Token dan Chat ID disimpan sebagai **Cloudflare Secret** (terenkripsi), bukan di kode atau Git.
