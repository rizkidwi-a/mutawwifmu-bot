# Asisten Percakapan WhatsApp MUTAWWIFMU

Asisten WhatsApp untuk calon jemaah yang mencari informasi layanan MUTAWWIFMU sebelum pemesanan. Spesifikasi: `.scratch/whatsapp-customer-service-chatbot/spec.md`; konteks domain: `CONTEXT.md`.

Saat ini transport WhatsApp aktif melalui nomor pengembangan `+62 895 0700 3830` (Fonnte). Perilaku percakapan mencakup balasan awal yang aman, pengumpulan Permintaan Tindak Lanjut (layanan yang diminati dari menu Layanan MUTAWWIFMU, tanggal/periode, jumlah jemaah, kebutuhan detail; anggaran opsional), handoff ke admin yang selalu diawali persetujuan calon jemaah, jawaban FAQ layanan dari materi bisnis, serta Harga Indikatif dari angka harga yang tercantum materi.

## Menjalankan

Prasyarat: Node.js >= 22.18.

```bash
npm install
cp .env.example .env   # isi kredensial provider yang dipilih
npm start              # proses bot berjalan setiap saat di PORT (default 3000)
```

Proses bot dirancang berjalan 24/7 sebagai layanan panjang (mis. via systemd/container), sehingga balasan otomatis tidak bergantung pada jam kerja admin.

`npm start` membaca `.env` sendiri lewat flag Node `--env-file-if-exists`, jadi tidak perlu alat pemuat environment tambahan. Perlu diketahui: **variabel yang sudah ada di shell menimpa isi `.env`**. Kalau bot start dengan nilai yang tidak sesuai `.env`, periksa dulu `echo $WHATSAPP_API_TOKEN` (PowerShell: `$env:WHATSAPP_API_TOKEN`).

### Provider

`WHATSAPP_PROVIDER` memilih integrasi; hanya variabel milik provider terpilih yang wajib diisi.

| Provider | Kredensial | Catatan |
| --- | --- | --- |
| `whatsapp-cloud-api` (default) | Phone Number Id, token, app secret | Memerlukan akun Meta for Developers + WABA + OTP nomor. Lihat `docs/adr/0001-provider-whatsapp-cloud-api.md`. |
| `fonnte` | token perangkat Fonnte | Onboarding tanpa Meta for Developers. Lihat `docs/adr/0003-provider-bsp-fonnte.md`. |

Migrasi dari `fonnte` ke `whatsapp-cloud-api` (langkah dashboard Meta, kredensial, webhook, smoke test):

```bash
bash scripts/wizard-migrasi-meta.sh   # wizard interaktif, satu langkah per layar
```

Versi bacaan + penjelasan: **`docs/tutorial-migrasi-ke-meta-cloud-api.md`**. Memerlukan akses akun Meta for Developers.

### Webhook

Provider WhatsApp mengirim pesan masuk sebagai webhook HTTPS publik ke `GET/POST /webhook` proses ini. Bentuk autentikasinya berbeda per provider:

- **Cloud API** — `GET /webhook` menjalankan handshake Meta (`hub.verify_token` harus cocok dengan `WHATSAPP_WEBHOOK_VERIFY_TOKEN`); `POST /webhook` ditandatangani `X-Hub-Signature-256` (HMAC-SHA256 dengan `WHATSAPP_APP_SECRET`) dan ditolak tanpa tanda tangan sah.
- **Fonnte** — tidak ada handshake; `GET /webhook` berakhir 404. `POST /webhook` harus dipanggil pada URL yang memuat token: `https://<host>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>`, karena Fonnte tidak menandatangani badan permintaan. Token juga boleh menjadi segmen terakhir path (`/webhook/<token>`).

Pada dashboard Fonnte, webhook diisi di menu perangkat dengan **auto read aktif**, karena tanpa itu webhook tidak terpanggil.

Untuk pengembangan lokal, teruskan port proses ke URL HTTPS publik (lalu daftarkan URL tersebut di dashboard provider):

```bash
ngrok http 3000        # atau: cloudflared tunnel --url http://localhost:3000
```

Keduanya perlu dipasang lebih dulu (`winget install ngrok.ngrok` / `winget install Cloudflare.cloudflared`). Tunnel hanya untuk pembuktian awal; untuk bot yang berjalan terus-menerus, jalankan proses bot di server/VPS dengan domain sendiri agar URL webhook stabil.

Langkah verifikasi nomor per provider: `docs/whatsapp-number-cutover.md`.

## FAQ layanan

Bot menjawab pertanyaan pra-pemesanan langsung dari materi bisnis yang tersedia (lihat `docs/adr/0004-faq-materi-pencocokan-aturan.md`): definisi Private Premium Umrah & Land Arrangement, mutawwif, visa/dokumen, hotel/akomodasi, transportasi/armada, airport handling, city tour yang tercantum (umum dan per destinasi), serta layanan lain dalam profil perusahaan — tour guide 190 negara, charity program, dukungan multibahasa, fotografer/videografer, dan custom itinerary. Jawaban disusun hanya dari fakta materi MUTAWWIFMU — rincian paket, layanan, atau ketentuan yang tidak tercantum tidak dikarang — dan diberikan dalam bahasa yang digunakan calon jemaah (Bahasa Indonesia atau Inggris).

Pertanyaan yang memerlukan konfirmasi tidak dijawab dari asumsi; pertanyaan yang tidak didukung materi atau tidak pasti mengalir ke alur handoff: penjelasan singkat, lalu permintaan persetujuan sebelum diteruskan ke admin. Jawaban FAQ tidak membuka transaksi; booking dan pembayaran tetap menjadi kasus handoff.

## Harga Indikatif

Pertanyaan angka harga yang tercantum materi dijawab sebagai Harga Indikatif (lihat `docs/adr/0005-harga-indikatif-penyempitan-pola-harga.md`): mutawwif per grup, dokumen/visa per pax, airport handling, transportasi per rute/armada, city tour per jumlah peserta, serta fotografer/videografer per sesi. Setiap jawaban menyatakan bahwa angka tersebut bukan penawaran final dan mengarahkan konfirmasi harga terkini ke tim MUTAWWIFMU.

Untuk harga hotel, materi memuat keterangan satuan yang bertentangan — per orang pada sampul dan per kamar pada bagian tabel — sehingga bot menyebutkan konflik tersebut, menyatakan satuannya belum terverifikasi, dan tidak menafsirkan angkanya sebagai harga per orang maupun per kamar. Satuan yang tidak tercantum materi (mis. per malam) juga tidak ditafsirkan sendiri. Permintaan penawaran khusus, konfirmasi harga/ketersediaan, serta pertanyaan harga yang angkanya tidak tercantum materi tetap diarahkan ke alur admin; bot tidak menjanjikan ketersediaan hotel/layanan dan tidak melakukan transaksi.

## Handoff ke admin

Bot meneruskan percakapan ke admin hanya setelah calon jemaah menyetujui penerusan informasinya; bila ditolak, informasi tidak diteruskan. Kasus yang diteruskan: permintaan berbicara dengan manusia, pertanyaan yang tidak didukung/tidak pasti, permintaan penawaran khusus/konfirmasi harga atau ketersediaan, pertanyaan agen/korporasi, booking/pembayaran, perjalanan aktif, dan keadaan darurat. Pesan konfirmasi tidak menjanjikan waktu balasan admin.

Penerima handoff berada di balik port `AdminChannel` (`src/adminChannel.ts`) — spec melarang mengasumsikan CRM/shared inbox tertentu. Keputusan pemilik (lihat `docs/adr/0006-kanal-admin-whatsapp.md`): handoff dikirim sebagai **pesan WhatsApp ke nomor admin** yang dibaca dari `WHATSAPP_ADMIN_NUMBER`, melalui provider yang sama dengan bot; isi handoff juga dicatat ke log proses sebagai jejak audit. Mengganti implementasi `AdminChannel` tidak mengubah perilaku percakapan.

Jumlah Permintaan Tindak Lanjut yang berhasil diteruskan (metrik utama) serta FAQ yang terjawab tanpa handoff (metrik pendamping) tersedia di `GET /metrics` dan dihitung oleh port `Metrics` (`src/metrics.ts`). Konteks percakapan multi-giliran disimpan di balik port `ConversationStore` (`src/conversationStore.ts`) dengan implementasi in-memory sementara; keputusan persistent store/retensi belum diambil.

## Transkrip percakapan

Selain handoff, setiap pesan teks masuk dan balasan yang benar-benar terkirim dicatat sebagai baris CSV agar riwayat mudah dibaca di Excel/Google Sheets (lihat `docs/adr/0007-transkrip-percakapan-csv.md`). Berkasnya di `data/transkrip-percakapan.csv` (dibuat otomatis, kolom `waktu`, `nomor`, `peran`, `pesan`; waktu WIB). `data/` diabaikan git karena memuat data pribadi — jangan di-commit atau disalin ke tempat publik. Penulisan bersifat best-effort: bila berkas gagal ditulis, balasan bot tetap terkirim dan kegagalannya hanya tercatat di log proses. Mengganti tujuan transkrip cukup mengganti implementasi port `ConversationTranscript` (`src/conversationTranscript.ts`).

## Konfigurasi

Semua identitas provider, nomor pengirim, dan nomor admin penerima handoff berasal dari environment (lihat `.env.example`). Mengganti nomor ke nomor produksi cukup lewat konfigurasi — perilaku percakapan tidak berubah. Jalur cutover: `docs/whatsapp-number-cutover.md`.

Sebelum cutover, jalankan `npm run cutover:check` untuk memastikan konfigurasi provider sudah lengkap dan nomor pengirim bukan lagi nomor pengembangan (perintah keluar dengan kode 1 bila belum siap). Pergantian nomor tidak membawa riwayat percakapan — batasannya dijelaskan di `docs/whatsapp-number-cutover.md` bagian "Batasan migrasi riwayat percakapan".

**Panduan langkah demi langkah untuk pemilik (checklist cutover yang dapat dicentang):** `docs/tutorial-cutover-nomor-produksi.md`.

## Pengujian

```bash
npm test          # seluruh tes (perilaku seam + kontrak transport)
npm run typecheck # pemeriksaan tipe
```

Seam pengujian yang disepakati adalah batas pemrosesan pesan masuk (`src/conversation/handleInbound.ts`): pesan + konteks percakapan → balasan + tindakan terlihat, provider-agnostic. Tes perilaku pada seam tersebut (pengumpulan bidang Permintaan Tindak Lanjut, anggaran opsional, larangan meminta data sensitif, permintaan persetujuan, penolakan, pemicu handoff) adalah tes utama. Tes transport memastikan pesan masuk dan balasan keluar benar-benar melalui kanal provider, dan tes wiring memastikan handoff diteruskan ke kanal admin serta terhitung sebagai metrik — keduanya tidak menggantikan tes perilaku pada seam tersebut.

## Struktur

```text
src/
├── conversation/          # seam percakapan (provider-agnostic)
│   ├── handleInbound.ts   # pemrosesan pesan masuk -> balasan + tindakan
│   ├── classifyInbound.ts # routing pesan masuk: faq / indicative-price / handoff / opener
│   ├── language.ts        # deteksi bahasa balasan
│   └── types.ts
├── knowledge/             # materi FAQ (jawaban disusun dari materi bisnis)
├── adapters/
│   ├── factory.ts         # pemilihan adapter sesuai WHATSAPP_PROVIDER
│   ├── webhookSupport.ts  # helper HTTP bersama antar adapter webhook
│   ├── fonnte/            # transport BSP Fonnte (webhook + pengirim)
│   └── whatsapp-cloud/    # transport WhatsApp Cloud API (webhook + pengirim)
├── adminChannel.ts        # port kanal penerimaan admin (handoff)
├── config.ts              # konfigurasi dari environment
├── cutoverPreflight.ts    # penilaian kesiapan konfigurasi cutover nomor produksi
├── cutoverCheck.ts        # entry point npm run cutover:check
├── conversationStore.ts   # port penyimpanan konteks percakapan
├── conversationTranscript.ts # port transkrip percakapan (CSV untuk pemilik)
├── inboundTransport.ts    # port penerimaan pesan masuk
├── messageSender.ts       # port pengiriman pesan keluar
├── metrics.ts             # port metrik keberhasilan
├── server.ts              # server webhook (+ GET /metrics)
└── main.ts                # entry point proses bot
docs/
├── adr/                   # keputusan arsitektur (lihat CONTEXT.md)
└── whatsapp-number-cutover.md
data/                      # transkrip percakapan (diabaikan git; data pribadi)
```
