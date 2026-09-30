# Asisten Percakapan WhatsApp MUTAWWIFMU

Asisten WhatsApp untuk calon jemaah yang mencari informasi layanan MUTAWWIFMU sebelum pemesanan. Spesifikasi: `.scratch/whatsapp-customer-service-chatbot/spec.md`; konteks domain: `CONTEXT.md`.

Saat ini baru tahap 01: transport WhatsApp melalui nomor pengembangan `+62 895 0700 3830` dengan balasan awal yang aman. Perilaku FAQ, penanganan Permintaan Tindak Lanjut, dan handoff ke admin dikerjakan tiket berikutnya.

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
│   ├── factory.ts         # pemilihan adapter sesuai WHATSAPP_PROVIDER
│   ├── webhookSupport.ts  # helper HTTP bersama antar adapter webhook
│   ├── fonnte/            # transport BSP Fonnte (webhook + pengirim)
│   └── whatsapp-cloud/    # transport WhatsApp Cloud API (webhook + pengirim)
├── config.ts              # konfigurasi dari environment
├── inboundTransport.ts    # port penerimaan pesan masuk
├── messageSender.ts       # port pengiriman pesan keluar
├── server.ts              # server webhook
└── main.ts                # entry point proses bot
docs/
├── adr/                   # keputusan arsitektur (lihat CONTEXT.md)
└── whatsapp-number-cutover.md
```
