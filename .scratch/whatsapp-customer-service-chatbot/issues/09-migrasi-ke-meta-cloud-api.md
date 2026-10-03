# 09: Migrasi provider aktif dari Fonnte (BSP) ke WhatsApp Cloud API (Meta)

**What to build:** Provider integrasi aktif berpindah dari Fonnte ke WhatsApp Cloud API resmi Meta, sekarang setelah pemilik dapat mengakses akun Meta for Developers. Perilaku percakapan tidak boleh berubah.

**Blocked by:** 01 (transport provider sudah ada); prasyarat eksternal: akses akun Meta for Developers (kini tersedia)

**Status:** ready-for-human

## Latar

ADR-0001 memilih WhatsApp Cloud API sebagai provider, tetapi ADR-0003 menambahkan Fonnte sebagai jalur alternatif karena saat itu akun Meta for Developers tidak dapat dibuat. ADR-0003 secara eksplisit menyatakan: "Keputusan provider produksi diambil ulang lewat ADR terpisah." Pemilik kini sudah bisa masuk ke akun Meta Developer, sehingga keputusan itu dapat diambil.

Kode Cloud API sudah ada dan sudah teruji lewat unit test serta tes transport (`tests/adapters/whatsappCloud*.test.ts`, `tests/transport/endToEnd.test.ts`), tetapi belum pernah dijalankan secara live.

## Rencana

Panduan langkah demi langkah untuk pemilik: `docs/tutorial-migrasi-ke-meta-cloud-api.md`.

Tiga jalur nomor, berbeda risiko (nomor yang masih terdaftar di aplikasi WhatsApp tidak dapat dipakai Cloud API):

- **Jalur A — nomor uji Meta** (disarankan lebih dulu): membuktikan Cloud API tanpa memutus Fonnte. Batas 5 penerima uji.
- **Jalur B — nomor pengembangan** `+62 895 0700 3830`: memutus Fonnte dan menghapus nomor dari aplikasi WhatsApp; tidak dapat dibatalkan.
- **Jalur C — nomor produksi** `+62 877 4587 3159`: cutover penuh; tumpang tindih dengan tiket 06.

## Kriteria penerimaan

- [ ] Kredensial Cloud API terisi di `.env`: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN` (token system user permanen), `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- [ ] `WHATSAPP_PROVIDER=whatsapp-cloud-api`; `npm run cutover:check` menyatakan siap.
- [ ] Webhook terverifikasi di dashboard Meta (handshake `hub.challenge` berhasil) dan field `messages` di-subscribe.
- [ ] Smoke test end-to-end lewat nomor Cloud API: balasan awal, FAQ tanpa handoff, handoff dengan persetujuan sampai ke nomor admin, metrik bertambah.
- [ ] `npm test` dan `npm run typecheck` hijau.
- [ ] Tidak ada perubahan pada `src/conversation/` — perilaku percakapan identik.
- [ ] Adapter Fonnte tetap ada sebagai jalur rollback lewat konfigurasi.
- [ ] Keputusan provider produksi dicatat sebagai ADR baru yang menggantikan ADR-0003 (setelah migrasi terbukti stabil).

## Perubahan kode sesi ini

- `src/config.ts` — default `WHATSAPP_API_BASE_URL` dinaikkan dari `v21.0` (berlaku sampai 21 Jan 2027) ke `v26.0`; tetap dapat ditimpa lewat environment.
- `tests/config.test.ts` — ekspektasi default disesuaikan.
- `.env.example` — komentar migrasi + versi Graph API terbaru.
- `docs/tutorial-migrasi-ke-meta-cloud-api.md` — panduan mandiri untuk pemilik (fase 1–10, jalur nomor, troubleshooting, rollback).

## Comments

### Migrasi dijalankan lewat otomasi browser (agent)

Pemilik meminta agent menjalankan sendiri langkah dashboard Meta. Dikerjakan dengan `tabbit-cli` (Playwright) pada sesi browser pemilik yang sudah login, ditambah verifikasi langsung ke Graph API.

Temuan saat memeriksa `.env` pemilik:

- `WHATSAPP_API_TOKEN` ternyata **token sementara** dari tombol "Generate access token" di API Setup: `debug_token` melaporkan `type=USER`, `expires_at=2026-10-03T06:00:00Z` (kedaluwarsa hari itu juga), dan scope `business_management` tidak ada.
- Akar masalahnya: system user `test` (ID `61594777541499`) ada, tetapi **tidak punya aset yang ditetapkan** — halaman Business Settings menampilkan "Tidak Ada Aset yang Ditetapkan", sehingga token apa pun tidak akan berizin.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` kosong; diisi ulang dengan nilai acak 32 char.

Tindakan yang dilakukan agent di dashboard:

1. Business Settings → Pengguna sistem → `test` → **Tetapkan Aset**: aplikasi `tes` (`1113163604491910`) dengan **Akses penuh → Kelola Aplikasi**, dan **Test WhatsApp Business Account**. Hasil: "test dapat mengakses 2 aset bisnis".
2. **Buat token** untuk app `tes`, kedaluwarsa **Jangan pernah**, izin `business_management` + `whatsapp_business_messaging` + `whatsapp_business_management`. Token disimpan langsung ke `.env` tanpa ditampilkan.
3. WhatsApp → Konfigurasi → Webhook: URL Callback `https://meetup-scientists-planning-retailer.trycloudflare.com/webhook` + verify token, lalu **Verifikasi dan simpan**. Kolom Webhook muncul dan field **`messages` sudah berlangganan**.

Verifikasi yang dijalankan:

- `debug_token`: `valid=true`, `type=SYSTEM_USER`, `expires_at=0` (permanen), ketiga izin lengkap.
- Baca Phone Number Id: `+1 555-631-6757` ("Test Number").
- Handshake lewat tunnel publik: `200` + challenge dikembalikan.
- Jalur keluar: `POST /{phone-number-id}/messages` ke `6289507003830` → HTTP 200 + `wamid` diterima.
- `npm run cutover:check`: `[OK] provider-config`, `[OK] production-sender-number`, status **siap**.

Perubahan `.env` (semua lewat konfigurasi, tanpa perubahan kode):

```
WHATSAPP_PROVIDER=whatsapp-cloud-api
WHATSAPP_SENDER_NUMBER=+1 555-631-6757
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v26.0
WHATSAPP_PHONE_NUMBER_ID=1463817500145110
WHATSAPP_API_TOKEN=<token system user permanen>
WHATSAPP_APP_SECRET=<app secret>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<32 char acak>
```

Sisa tindakan manusia:

1. **Smoke test masuk**: kirim pesan WhatsApp dari `+62 895 0700 3830` (sudah terdaftar sebagai penerima uji) ke `+1 555-631-6757`, lalu lanjutkan alur FAQ dan handoff.
2. **Handoff**: nomor admin `+62 822 8388 6627` **belum** ada di daftar penerima uji API Setup, sehingga handoff akan gagal kirim. Tambahkan dulu (perlu verifikasi kode di HP admin) atau uji handoff setelah pindah ke nomor produksi.
3. **Tunnel & proses**: URL `trycloudflare` bersifat sementara — kalau tunnel restart, webhook harus didaftarkan ulang. Untuk 24/7, pindahkan bot ke VPS dengan domain tetap (tiket 07).

Catatan: aplikasi Meta yang dipakai bernama **`tes`** (bukan nama resmi MUTAWWIFMU). Berfungsi penuh untuk uji ini karena nomor uji Meta memang milik app tersebut; untuk produksi sebaiknya app dengan nama tampilan bisnis yang benar.
