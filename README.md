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

Ikuti langkah berikut berurutan. Tidak perlu keahlian pemrograman.

### 1. Siapkan aplikasi pendukung

Pasang dulu (cari di Google: "cara install Git" / "cara install Node.js"):

- **Git** — untuk mengunduh kode proyek.
- **Node.js versi 22.18 atau lebih baru** — untuk menjalankan bot.

### 2. Unduh kode proyek

Buka terminal (di Windows: PowerShell), lalu jalankan:

```bash
git clone https://github.com/rizkidwi-a/mutawwifmu-bot.git
cd mutawwifmu-bot
npm ci
```

Perintah `npm ci` akan mengunduh otomatis semua yang dibutuhkan bot. Tunggu sampai selesai.

### 3. Pastikan kode dalam keadaan baik

```bash
npm test
npm run typecheck
```

Jika semua lulus (tidak ada tulisan error/gagal), lanjut ke langkah berikutnya.

### 4. Buat file konfigurasi

Buat salinan file contoh bernama `.env`:

```bash
cp .env.example .env
```

Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Lalu buka file `.env` dengan text editor (misalnya Notepad) dan isi nilai yang diminta, mengikuti keterangan di dalam file tersebut.

> **Penting:**
> - Jangan pernah menulis isi file `.env` ke chat, email, atau commit Git. File ini berisi rahasia (token/kunci).
> - Mengunduh kode proyek saja **tidak** membuat bot langsung terhubung ke WhatsApp. Kredensial harus diisi sendiri.

### 5. Jalankan bot

```bash
npm start
```

Bot berjalan di komputer Anda pada port `3000` (bisa diubah lewat `.env`). Agar pesan WhatsApp sungguhan bisa masuk, alamat bot harus bisa diakses dari internet (HTTPS) lalu diarahkan ke endpoint `/webhook`. Cara umum untuk pengujian lokal: gunakan tunnel (misalnya ngrok); untuk produksi, lihat [Deployment ke EC2](docs/deploy-ec2.md).

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

---

Dibangun dengan **Node.js** dan **TypeScript**.
