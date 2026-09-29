# Asisten Percakapan WhatsApp MUTAWWIFMU

Asisten WhatsApp untuk calon jemaah yang mencari informasi layanan MUTAWWIFMU sebelum pemesanan. Spesifikasi: `.scratch/whatsapp-customer-service-chatbot/spec.md`; konteks domain: `CONTEXT.md`.

Saat ini baru tahap 01: transport WhatsApp melalui nomor pengembangan `+62 895 0700 3830` dengan balasan awal yang aman. Perilaku FAQ, penanganan Permintaan Tindak Lanjut, dan handoff ke admin dikerjakan tiket berikutnya.

## Menjalankan

Prasyarat: Node.js >= 22.18.

```bash
npm install
cp .env.example .env   # isi kredensial WhatsApp Cloud API
npm start              # proses bot berjalan setiap saat di PORT (default 3000)
```

Proses bot dirancang berjalan 24/7 sebagai layanan panjang (mis. via systemd/container), sehingga balasan otomatis tidak bergantung pada jam kerja admin.

### Webhook

Provider WhatsApp (lihat `docs/adr/0001-provider-whatsapp-cloud-api.md`) mengirim pesan masuk sebagai webhook HTTPS publik ke `GET/POST /webhook` proses ini:

- `GET /webhook` — handshake verifikasi Meta (`hub.verify_token` harus cocok dengan `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
- `POST /webhook` — pesan masuk; ditandatangani `X-Hub-Signature-256` (HMAC-SHA256 dengan `WHATSAPP_APP_SECRET`), tanpa tanda tangan sah permintaan ditolak.

Untuk pengembangan lokal, teruskan port proses ke URL HTTPS publik (mis. `ngrok http 3000`) lalu daftarkan URL tersebut di dashboard Meta. Langkah verifikasi nomor lengkap: `docs/whatsapp-number-cutover.md`.

## Konfigurasi

Semua identitas provider dan nomor pengirim berasal dari environment (lihat `.env.example`). Mengganti nomor ke nomor produksi cukup lewat konfigurasi — perilaku percakapan tidak berubah. Jalur cutover: `docs/whatsapp-number-cutover.md`.

## Pengujian

```bash
npm test          # seluruh tes (perilaku seam + kontrak transport)
npm run typecheck # pemeriksaan tipe
```

Seam pengujian yang disepakati adalah batas pemrosesan pesan masuk (`src/conversation/handleInbound.ts`): pesan + konteks percakapan → balasan + tindakan terlihat, provider-agnostic. Tes transport memastikan pesan masuk dan balasan keluar benar-benar melalui kanal provider (webhook + API Graph) dan tidak menggantikan tes perilaku pada seam tersebut.

## Struktur

```text
src/
├── conversation/          # seam percakapan (provider-agnostic)
│   ├── handleInbound.ts   # pemrosesan pesan masuk -> balasan + tindakan
│   └── types.ts
├── adapters/
│   └── whatsapp-cloud/    # transport WhatsApp Cloud API (webhook + pengirim)
├── config.ts              # konfigurasi dari environment
├── messageSender.ts       # port pengiriman pesan keluar
├── server.ts              # server webhook
└── main.ts                # entry point proses bot
docs/
├── adr/                   # keputusan arsitektur (lihat CONTEXT.md)
└── whatsapp-number-cutover.md
```
