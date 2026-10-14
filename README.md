# Asisten WhatsApp Pra-Pemesanan MUTAWWIFMU

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API%20%7C%20Fonnte-25D366?logo=whatsapp&logoColor=white)](https://developers.facebook.com/docs/whatsapp/cloud-api/)

Asisten percakapan WhatsApp untuk membantu calon jemaah mendapatkan informasi pra-pemesanan, menyusun kebutuhan perjalanan, dan tersambung ke admin saat pertanyaan perlu ditangani manusia.

> Fokus proyek ini bukan sekadar membalas pesan: bot harus menjaga alur percakapan tetap berguna, menjawab berdasarkan materi yang tersedia, dan meneruskan kebutuhan kepada admin hanya setelah calon jemaah menyetujuinya.

## Masalah yang diselesaikan

Dalam layanan pra-pemesanan, calon jemaah dapat bertanya tentang layanan dan harga sambil menyampaikan kebutuhan perjalanan secara bertahap. Bot yang hanya memahami satu tahap percakapan berisiko mengulang balasan umum, kehilangan konteks, atau mencatat pertanyaan tanpa menjawabnya—terutama setelah ringkasan dikirim atau percakapan dialihkan ke admin. Sementara itu, harga khusus dan informasi yang tidak tersedia di materi harus dikonfirmasi oleh tim, bukan ditebak.

Proyek ini menangani masalah tersebut dengan alur percakapan multi-giliran yang memisahkan jawaban berbasis materi dari kebutuhan yang harus ditindaklanjuti admin.

| Tantangan | Penanganan |
| --- | --- |
| Kebutuhan calon jemaah disampaikan sedikit demi sedikit | Bot mengumpulkan layanan yang diminati, periode, jumlah jemaah, dan kebutuhan detail; lalu menampilkan ringkasan untuk diperiksa. |
| Harga atau jawaban tidak tersedia di materi | Bot tidak mengarang angka. Pertanyaan harga khusus dan informasi yang perlu dikonfirmasi diarahkan ke tim. |
| Handoff dapat terasa seperti akhir percakapan | Pertanyaan harga tetap dijawab di semua fase. Calon jemaah juga dapat memperbarui kebutuhan, memakai menu lanjutan, atau memulai ulang. |
| Admin perlu konteks sebelum menindaklanjuti | Ringkasan kebutuhan diteruskan setelah persetujuan eksplisit; admin menerima alasan handoff dan konteks yang diperlukan. |

## Cara kerja

1. **Memahami pesan masuk** menggunakan klasifikasi berbasis aturan; Gemini dapat diaktifkan secara opsional sebagai lapisan pemaham tambahan.
2. **Menjawab FAQ yang didukung materi**, termasuk harga indikatif yang memang tersedia. Jawaban tetap berasal dari materi bisnis, bukan teks bebas yang dibuat model.
3. **Mengumpulkan kebutuhan** calon jemaah secara bertahap dan memungkinkan pertanyaan menyela tanpa merusak alur.
4. **Menampilkan Ringkasan Kebutuhan** untuk diperiksa sebelum informasi diteruskan.
5. **Meminta persetujuan sebelum handoff**. Permintaan penawaran khusus, pertanyaan yang tidak didukung materi, booking/pembayaran, perjalanan aktif, keadaan darurat, dan permintaan berbicara dengan manusia mengikuti jalur penanganan yang sesuai.
6. **Tetap membantu setelah handoff**: pertanyaan harga tetap mendapat jawaban yang sesuai; pembaruan kebutuhan dan pilihan untuk mengulang percakapan tetap tersedia.

Pesan non-teks seperti gambar atau dokumen dicatat sebagai lampiran; bot tidak menafsirkan isi lampiran. Bot juga tidak menjanjikan waktu balasan admin.

## Sorotan teknis

- **Provider-agnostic conversation core**: logika percakapan dipisahkan dari transport WhatsApp.
- **Dua adapter WhatsApp**: WhatsApp Cloud API dan Fonnte.
- **Harga dan FAQ berbasis materi**: jawaban harga khusus diarahkan ke tim, tanpa mengarang nominal atau ketersediaan.
- **Gemini opt-in**: tanpa `GEMINI_API_KEY`, bot tetap berjalan dengan klasifikasi berbasis aturan.
- **Tes pada seam percakapan dan adapter** memakai test runner bawaan Node.js.
- Endpoint webhook tersedia di `/webhook`; metrik aplikasi tersedia di `GET /metrics`.

```text
WhatsApp Cloud API / Fonnte
            │
            ▼
      Adapter provider ──► HTTP server (/webhook)
                                  │
                                  ▼
                     Logika percakapan multi-giliran
                         ┌────────┴─────────┐
                         ▼                  ▼
                 FAQ & materi bisnis   Handoff ke admin
```

## Jalankan dari clone

### 1. Siapkan kebutuhan

- Git
- **Node.js 22.18 atau lebih baru** dan npm

Runtime menjalankan TypeScript langsung; tidak ada langkah build terpisah.

### 2. Clone dan pasang dependency

```bash
git clone https://github.com/rizkidwi-a/mutawwifmu-bot.git
cd mutawwifmu-bot
npm ci
```

### 3. Jalankan tes dan pemeriksaan tipe

Kedua perintah ini dapat dijalankan tanpa kredensial WhatsApp:

```bash
npm test
npm run typecheck
```

### 4. Siapkan konfigurasi lokal

Untuk menjalankan bot yang terhubung ke provider, salin file contoh:

```bash
cp .env.example .env
```

Di Windows PowerShell, gunakan:

```powershell
Copy-Item .env.example .env
```

Edit `.env` dan isi nomor serta kredensial milik akun uji Anda. Jangan masukkan secret ke source code, README, log, atau commit Git.

### 5. Pilih provider dan isi kredensial

Variabel bersama untuk semua provider:

| Variabel | Keterangan |
| --- | --- |
| `WHATSAPP_PROVIDER` | `whatsapp-cloud-api` atau `fonnte`. |
| `WHATSAPP_SENDER_NUMBER` | Nomor WhatsApp pengirim dalam format internasional. |
| `WHATSAPP_ADMIN_NUMBER` | Nomor admin penerima handoff. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token verifikasi webhook yang Anda tentukan. |

Untuk **WhatsApp Cloud API** (provider default), isi juga `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN`, dan `WHATSAPP_APP_SECRET`.

Untuk **Fonnte**, set `WHATSAPP_PROVIDER=fonnte` dan isi `WHATSAPP_API_TOKEN`. Jika `.env` masih berisi URL Cloud API dari contoh, ubah `WHATSAPP_API_BASE_URL` menjadi `https://api.fonnte.com`. `WHATSAPP_COUNTRY_CODE` bersifat opsional; default-nya `62`.

`PORT` default ke `3000`. `GEMINI_API_KEY` bersifat opsional; tanpa kunci ini klasifikasi berbasis aturan tetap aktif.

> Kredensial, nomor, dan endpoint harus berasal dari akun Anda sendiri. Meng-clone repository saja tidak membuat koneksi WhatsApp aktif.

### 6. Jalankan aplikasi dan hubungkan webhook

```bash
npm start
```

Server mendengarkan pada port yang dikonfigurasi (`3000` secara default). Agar pesan sungguhan dapat diterima, sediakan endpoint HTTPS yang dapat dijangkau provider—misalnya melalui tunnel untuk pengujian lokal atau deployment—lalu arahkan webhook provider ke `/webhook` dan samakan token verifikasinya.

Panduan konfigurasi provider dan deployment:

- [Migrasi ke WhatsApp Cloud API](docs/tutorial-migrasi-ke-meta-cloud-api.md)
- [Pergantian nomor WhatsApp](docs/whatsapp-number-cutover.md)
- [Tutorial cutover nomor produksi](docs/tutorial-cutover-nomor-produksi.md)
- [Deployment ke EC2](docs/deploy-ec2.md)

## Batasan dan penanganan data

- State percakapan utama disimpan **di memori proses**; state tersebut hilang ketika proses berhenti atau dimulai ulang.
- Transkrip pesan disimpan lokal sebagai CSV di `data/`. Transkrip dapat memuat nomor telepon dan isi pesan; perlakukan sebagai data pribadi dan jangan unggah ke repository publik.
- Data di `data/`, file `.env`, dan log runtime diabaikan oleh Git melalui `.gitignore`.
- Integrasi Gemini opsional hanya membantu pemahaman/klasifikasi pesan. Jawaban FAQ dan harga tetap dibatasi oleh materi bisnis yang tersedia.
- Integrasi end-to-end memerlukan akun dan konfigurasi provider WhatsApp; tes lokal tidak menggantikan uji webhook pada akun Anda.

## Struktur proyek

```text
src/
├── adapters/       # Adapter transport WhatsApp Cloud API dan Fonnte
├── conversation/  # Klasifikasi dan logika percakapan multi-giliran
├── knowledge/     # Materi FAQ, harga, guard angka, dan integrasi Gemini
├── config.ts      # Konfigurasi dari environment
├── server.ts      # Webhook dan endpoint metrics
└── main.ts        # Entry point aplikasi

tests/              # Tes unit dan integrasi

docs/
├── adr/            # Catatan keputusan arsitektur
└── *.md            # Panduan provider, cutover, dan deployment
```

## Dokumentasi

- [Konteks domain](CONTEXT.md)
- [Keputusan arsitektur](docs/adr/)
- [Panduan migrasi Cloud API](docs/tutorial-migrasi-ke-meta-cloud-api.md)
- [Panduan cutover nomor](docs/whatsapp-number-cutover.md)

---

Dibangun dengan **Node.js**, **TypeScript**, dan `node:test`.
