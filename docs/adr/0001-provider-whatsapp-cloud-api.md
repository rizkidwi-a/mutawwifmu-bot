# ADR-0001: Provider WhatsApp Cloud API (Meta)

Status: accepted

Catatan: dilengkapi oleh [ADR-0003](0003-provider-bsp-fonnte.md) yang menambahkan Fonnte sebagai alternatif saat akun Meta for Developers tidak dapat diakses. ADR-0003 melengkapi, bukan menggantikan, keputusan ini.

## Konteks

Tiket `.scratch/whatsapp-customer-service-chatbot/issues/01-whatsapp-development-sender.md` memilih provider integrasi WhatsApp agar nomor pengembangan `+62 895 0700 3830` dapat mengirim dan menerima pesan. Spec melarang mengasumsikan provider sebelum diputuskan; keputusan ini dibuat untuk tiket tersebut.

Kandidat yang dipertimbangkan:

- **WhatsApp Cloud API resmi (Meta Graph API)** — webhook masuk + REST keluar, tanpa perantara BSP.
- **BSP Indonesia (mis. Fonnte, Qontak, Wablas)** — onboarding lebih cepat, tetapi terkunci pada API dan penetapan harga vendor.

## Keputusan

Gunakan **WhatsApp Cloud API** (`https://graph.facebook.com/v21.0`) sebagai provider integrasi.

Catatan: versi Graph API yang dipakai sekarang dinaikkan lewat konfigurasi; `WHATSAPP_API_BASE_URL` default kini `v26.0` (versi terdahulu memiliki masa berlaku terbatas — lihat <https://developers.facebook.com/docs/graph-api/changelog>). Keputusan ini tetap berlaku sebagai desain provider yang dapat dikonfigurasi; rencana migrasi aktif dari Fonnte ke Cloud API (bekas tiket 09) **dibatalkan** oleh pemilik (2026-10-19) — Fonnte tetap provider produksi (ADR-0003).

Alasan:

- Resmi dan langsung; tidak ada ketergantungan pada API vendor perantara.
- Identitas pengirim berupa `phone number id` + token, sehingga nomor pengirim dan identitas provider dapat diganti lewat konfigurasi (kriteria tiket 01) tanpa mengubah perilaku percakapan.
- Nomor dapat didaftarkan dan diverifikasi per nomor (OTP SMS/telepon), cocok untuk nomor pengembangan sekarang dan nomor produksi kelak.
- Lapisan percakapan tetap provider-agnostic di `src/conversation/`; adapter berada di `src/adapters/whatsapp-cloud/`.

## Konsekuensi

- Dibutuhkan akun Meta for Developers, WABA (WhatsApp Business Account), dan verifikasi nomor via OTP sebelum nomor pengembangan benar-benar dapat menerima/mengirim pesan. Langkahnya didokumentasikan di `docs/whatsapp-number-cutover.md`.
- Webhook menuntut endpoint HTTPS publik; pengembangan lokal memerlukan tunnel (mis. ngrok/cloudflared). Lihat README.
- Pesan keluar yang dimulai bot (di luar jendela layanan 24 jam) tunduk pada aturan template Meta — di luar cakupan karena spec melarang kampanye proaktif.
- Bila kelak berganti provider (mis. ke BSP), cukup adapter baru di `src/adapters/`; seam percakapan dan tesnya tidak berubah. Keputusan ini harus direvisi lewat ADR baru.
