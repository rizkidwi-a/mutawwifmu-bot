# Asisten WhatsApp Pra-Pemesanan MUTAWWIFMU

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Bot WhatsApp untuk membantu calon jemaah: menjawab pertanyaan (layanan, harga, FAQ), mengumpulkan kebutuhan perjalanan, lalu meneruskannya ke admin—hanya setelah calon jemaah menyetujui.

> Bot tidak mengarang jawaban. Semua jawaban diambil dari materi resmi. Untuk pertanyaan yang belum ada jawabannya, bot meneruskannya ke admin.

## Apa yang bisa dilakukan bot

- Menjawab pertanyaan layanan dan harga berdasarkan materi resmi.
- Mengumpulkan kebutuhan perjalanan (layanan yang diminati, periode, jumlah jemaah) sedikit demi sedikit.
- Menampilkan **Ringkasan Kebutuhan** untuk diperiksa sebelum diteruskan ke admin.
- Meneruskan ke admin hanya setelah calon jemaah menyetujui.
- Tetap menjawab pertanyaan harga setelah percakapan dialihkan ke admin.

Catatan sederhana:

- Gambar atau dokumen yang dikirim hanya dicatat, tidak dibaca isinya.
- Bot tidak menjanjikan kapan admin akan membalas.

## Cara kerja (sederhana)

```text
Pesan WhatsApp masuk
        │
        ▼
  Bot memahami pesan ──► Menjawab dari materi resmi
        │
        ▼
  Mengumpulkan kebutuhan ──► Ringkasan ──► Persetujuan ──► Diteruskan ke admin
```

## Cara menjalankan

Ikuti langkah berikut berurutan.

### 1. Siapkan aplikasi pendukung

Pasang dulu (cari di Google: "cara install Git" / "cara install Node.js"):

- **Git** 
- **Node.js versi 22.18 atau lebih baru** 

### 2. Unduh kode proyek

Buka terminal (di Windows: PowerShell), lalu jalankan:

```bash
git clone https://github.com/rizkidwi-a/mutawwifmu-bot.git
cd mutawwifmu-bot
npm ci
```

Perintah `npm ci` akan mengunduh otomatis semua yang dibutuhkan bot. Tunggu sampai selesai.

### 3. Buat file konfigurasi

Buat salinan file bernama `.env` di terminal projek yang sama:

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Lalu buka file `.env` dengan text editor dan isi nilai yang diminta, mengikuti keterangan di dalam file tersebut.

### 4. Jalankan bot

```bash
npm start
```

Bot berjalan di komputer Anda pada port `3000` (bisa diubah lewat `.env`). Biarkan terminal ini tetap terbuka selama bot dipakai.

### 5. Dapatkan alamat webhook dan daftarkan ke penyedia WhatsApp

**Apa itu webhook?** Webhook adalah "alamat rumah" bot di internet. Ketika ada pesan WhatsApp masuk, penyedia WhatsApp akan mengirim pesan itu ke alamat tersebut, lalu bot membalasnya. Tanpa webhook, pesan tidak akan pernah sampai ke bot.

**Bentuk alamatnya:** `https://alamat-anda/webhook` — yaitu alamat publik bot Anda ditambah `/webhook`.

**Cara mendapatkannya (pilih salah satu):**

- **Untuk percobaan di komputer sendiri** — pakai tunnel [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (gratis, tanpa daftar akun):
  1. Pastikan bot (langkah 4) sedang berjalan.
  2. Buka terminal **baru**, lalu jalankan:

     ```bash
     cloudflared tunnel --url http://localhost:3000
     ```

  3. Di output cloudflared, cari baris seperti `+ https://xxxx-xxxx.trycloudflare.com` — itu alamat publik bot Anda.
  4. Alamat webhook Anda: `https://xxxx-xxxx.trycloudflare.com/webhook` (beberapa penyedia meminta token disisipkan di URL, misalnya `/webhook?token=...` — ikuti petunjuk di dashboard penyedia).

  Catatan: alamat tunnel ini berubah setiap kali cloudflared diulang, jadi harus didaftarkan ulang setiap kali bot atau komputer dimulai lagi.

- **Untuk pemakaian tetap (produksi)** — bot dijalankan di server yang punya alamat tetap, contohnya di cloud. Langkahnya: [Deployment ke EC2](docs/deploy-ec2.md).

**Cara mendaftarkan:**

1. Buka dashboard/panel penyedia WhatsApp Anda (tempat Anda membuat/mengelola bot).
2. Cari menu pengaturan **webhook**.
3. Tempel alamat webhook yang sudah Anda buat di atas.
4. Buat **token verifikasi** (kata rahasia bebas yang Anda tentukan sendiri) di dashboard tersebut, lalu isi token yang **sama persis** di file `.env` pada baris `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
5. Simpan. Jika pengaturan benar, dashboard akan menunjukkan status webhook aktif/terverifikasi.

**Uji cepat:** buka `http://localhost:3000/metrics` di browser. Jika muncul data (bukan halaman error), bot sudah berjalan dengan baik.

> Penyedia WhatsApp akan berganti di masa mendatang, jadi nama menu di dashboard bisa berbeda — yang penting tetap sama: alamat webhook menunjuk ke `/webhook` bot Anda, dan token verifikasinya cocok.

## Batasan yang perlu diketahui

- Percakapan yang sedang berjalan disimpan **di memori** (RAM). Jika bot dimatikan atau diulang, riwayat percakapan hilang.
- Catatan pesan disimpan sebagai CSV di folder `data/`. Isinya bisa memuat nomor telepon dan isi pesan — anggap sebagai data pribadi, jangan diunggah ke mana pun.
- File rahasia (`.env`), folder `data/`, dan log sudah otomatis diabaikan Git.
- Fitur AI (Gemini) bersifat **opsional**. Tanpa kunci API Gemini, bot tetap berjalan penuh memakai aturan biasa.

## Struktur proyek

```text
src/
├── adapters/       # Penghubung ke layanan pesan WhatsApp
├── conversation/   # Logika percakapan bot
├── knowledge/      # Materi FAQ, harga, dan jawaban bot
├── config.ts       # Pengaturan dari file .env
├── server.ts       # Penerima pesan (webhook)
└── main.ts         # Titik awal aplikasi

tests/              # Tes otomatis
docs/               # Dokumentasi teknis dan keputusan desain
```

## Dokumentasi lanjutan

- [Konteks domain](CONTEXT.md) — istilah dan alur bisnis proyek.
- [Keputusan arsitektur](docs/adr/) — alasan teknis di balik desain.
- [Deployment ke EC2](docs/deploy-ec2.md) — menjalankan bot di server.

