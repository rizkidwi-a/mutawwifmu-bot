# Jalur Verifikasi Nomor & Cutover ke Nomor Produksi

Dokumen ini menjelaskan (1) langkah verifikasi provider agar nomor pengembangan dapat dipakai, dan (2) jalur penggantian ke nomor produksi kelak. Perilaku percakapan tidak ikut berubah saat nomor diganti — nomor pengirim dan identitas provider sepenuhnya berasal dari konfigurasi (lihat ADR-0001 dan tes "perilaku percakapan tidak berubah saat nomor pengirim dan identitas provider diganti").

## Kondisi sekarang

| Nilai | Sumber |
| --- | --- |
| Nomor pengembangan | `+62 895 0700 3830` (dikembangkan dan diverifikasi untuk pengembangan) |
| Provider | WhatsApp Cloud API (Meta) sebagai pilihan utama, Fonnte (BSP) sebagai alternatif; lihat `docs/adr/0001-provider-whatsapp-cloud-api.md` dan `docs/adr/0003-provider-bsp-fonnte.md` |
| Nomor konsultasi profil (`+62 877 4587 3159`) | Tidak berada dalam kendali pengguna — **bukan** prasyarat pengembangan |

Konfigurasi yang mengendalikan identitas pengirim (lihat `.env.example`):

- `WHATSAPP_PROVIDER` — provider yang dipakai: `whatsapp-cloud-api` (default) atau `fonnte`.
- `WHATSAPP_SENDER_NUMBER` — nomor pengirim (E.164, mis. `+62 895 0700 3830`)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — rahasia endpoint webhook; maknanya mengikuti provider (handshake pada Cloud API, token URL pada Fonnte)
- `WHATSAPP_API_TOKEN` — token provider
- `WHATSAPP_API_BASE_URL` — dasar API, default per provider
- `WHATSAPP_PHONE_NUMBER_ID` — Phone Number Id Cloud API (khusus Cloud API)
- `WHATSAPP_APP_SECRET` — app secret untuk verifikasi tanda tangan webhook (khusus Cloud API)
- `WHATSAPP_COUNTRY_CODE` — kode negara tujuan pada Fonnte (opsional, default `62`)

## Langkah verifikasi nomor pengembangan pada WhatsApp Cloud API (sekali di awal)

Langkah ini hanya dapat dilakukan oleh pemilik akun bisnis (manual, di dashboard Meta):

1. Buat aplikasi di [Meta for Developers](https://developers.facebook.com/) dan tambahkan produk **WhatsApp**.
2. Siapkan WhatsApp Business Account (WABA) dan Business Portfolio; isi profil bisnis (nama tampilan, kategori).
3. Daftarkan nomor `+62 895 0700 3830` ke WABA melalui dashboard WhatsApp > API Setup, lalu verifikasi kepemilikan nomor via **OTP SMS atau telepon**.
   - Nomor harus dapat menerima SMS/telepon OTP; jika nomor sudah terdaftar di WhatsApp biasa/WhatsApp Business, migrasikan ke WhatsApp Business Platform terlebih dahulu.
4. Catat **Phone Number Id** dan buat **access token permanen** (System User di Meta Business Settings) dengan izin `whatsapp_business_messaging` dan `whatsapp_business_management`.
5. Salin **App Secret** (Settings > Basic) untuk verifikasi tanda tangan webhook.
6. Daftarkan endpoint webhook: URL publik HTTPS proses bot (lihat README bagian tunnel) + `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, lalu subscribe field **messages**.
7. Uji kirim dan terima pesan ke nomor pengembangan, lalu cocokkan dengan tes transport (`npm test`).

Status verifikasi nomor ada di dashboard WhatsApp > Phone Numbers (status harus **Verified/Connected**).

## Langkah verifikasi nomor pengembangan pada Fonnte (alternatif)

Langkah ini dipakai bila akun Meta for Developers belum dapat dibuat (lihat `docs/adr/0003-provider-bsp-fonnte.md`). Hanya kredensial Fonnte yang perlu diisi; `WHATSAPP_PHONE_NUMBER_ID` dan `WHATSAPP_APP_SECRET` tidak relevan.

1. Daftar akun di Fonnte, tambahkan perangkat WhatsApp dengan nomor `+62 895 0700 3830`, lalu hubungkan lewat QR atau kode Sinkit.
2. Pastikan perangkat berstatus **connected** dan **auto read** aktif; tanpa auto read, webhook tidak pernah dipanggil.
3. Salin token perangkat ke `WHATSAPP_API_TOKEN`, lalu isi `WHATSAPP_SENDER_NUMBER` dan `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (token acak yang hanya kamu tahu).
4. Daftarkan webhook di menu perangkat: `https://<host-publik>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>`.
5. Jalankan proses bot, lalu smoke test: kirim pesan ke nomor pengembangan dan pastikan balasan bot masuk.
6. Jalankan `npm test` dan `npm run typecheck` untuk memastikan kontrak transport tetap hijau.

## Jalur cutover ke nomor produksi

Tiket terkait: `.scratch/whatsapp-customer-service-chatbot/issues/06-production-number-cutover.md`.

1. **Pilih dan miliki nomor produksi** — nomor yang dapat menerima OTP dan sudah disetujui untuk WhatsApp Business Platform. Nomor konsultasi pada profil perusahaan hanya dapat dipakai bila pemiliknya menyerahkan kendali dan lolos migrasi/verifikasi.
2. **Verifikasi provider untuk nomor produksi** — daftarkan nomor ke WABA yang sama (atau WABA baru), verifikasi via OTP, lalu setujui nama tampilan bisnis. Untuk volume/fitur produksi, lengkapi **Business Verification** Meta (dokumen legal bisnis).
3. **Dapatkan identitas baru** — catat Phone Number Id baru dan perbarui token bila diperlukan.
4. **Ganti konfigurasi saja** (tanpa perubahan kode):
   - `WHATSAPP_SENDER_NUMBER=+62 <nomor produksi>`
   - `WHATSAPP_PHONE_NUMBER_ID=<phone number id baru>`
   - `WHATSAPP_API_TOKEN=<token baru bila ada>`
   - bila WABA berubah, perbarui juga langganan webhook ke WABA baru.
5. **Restart proses bot** (`npm start` atau layanan yang menjalankannya) agar konfigurasi termuat ulang.
6. **Smoke test end-to-end** — kirim pesan dari nomor pribadi ke nomor produksi, pastikan balasan awal terkirim; jalankan `npm test` untuk memastikan tes transport tetap hijau.
7. **Pensiunkan nomor pengembangan** (opsional) — hapus dari WABA setelah produksi stabil; jangan hapus sebelum smoke test lolos.

Checklist keberhasilan cutover: pesan masuk ke nomor produksi menghasilkan balasan; tidak ada nilai nomor pengembangan yang tertinggal di konfigurasi; perilaku percakapan identik (tidak ada perubahan kode pada `src/conversation/`).
