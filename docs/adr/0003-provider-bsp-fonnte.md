# ADR-0003: Provider WhatsApp BSP Fonnte sebagai alternatif Cloud API

Status: accepted

## Konteks

ADR-0001 memilih WhatsApp Cloud API (Meta) sebagai provider integrasi. Saat implementasi, pemilik akun tidak dapat membuat akun Meta for Developers, sehingga nomor pengembangan `+62 895 0700 3830` tidak dapat didaftarkan ke WABA maupun diverifikasi lewat OTP. Dua jalan keluar tersedia: menunggu akses Meta, atau beralih ke Business Solution Provider (BSP) yang onboarding-nya tidak melalui Meta for Developers.

Kandidat BSP yang dipertimbangkan:

- **Fonnte** — API HTTP sederhana (`POST /send`), token per perangkat, webhook datar, onboarding lewat verifikasi nomor di dashboard Fonnte.
- **Wablas / Qontak** — onboarding lewat form, tetapi cakupannya lebih luas.
- **Twilio** — API matang, namun orientasi SMS dan kurang optimal untuk region Indonesia.

## Keputusan

Tambahkan **Fonnte** sebagai provider kedua yang dipilih lewat konfigurasi, tanpa menghapus Cloud API.

Alasan:

- Onboarding tidak memerlukan akun Meta for Developers: daftar di Fonnte, ambil token perangkat, hubungkan nomor.
- Bentuk API dan webhook sederhana, sehingga adapter-nya kecil dan tidak menambah dependency runtime.
- Cloud API tetap tersedia sebagai pilihan, jadi keputusan ini tidak mengunci proyek selamanya.

## Konsekuensi

- Kunci vendor pada API Fonnte dan model harga per pesan. Mitigasi: seluruh provider berada di balik port `MessageSender` dan `InboundTransport`, sehingga kembali ke Cloud API cukup lewat konfigurasi.
- Fonnte tidak menandatangani badan webhook dan tidak punya handshake langganan. Autentikasi endpoint memakai token yang disisipkan pada URL webhook (`?token=...`), sehingga permintaan dari luar tidak langsung memakai kuota.
- Webhook Fonnte hanya berjalan bila **auto read** diaktifkan pada perangkat, dan nomor harus berstatus terhubung.
- Field `id` pesan masuk diambil dari `inboxid`; bila kosong, adapter membuat id sintetis. Saat ini id tersebut tidak dipakai untuk keperluan lain.
- Nomor produksi mengikuti jalur yang sama seperti pada Cloud API (lihat `docs/whatsapp-number-cutover.md`).

## Catatan

Fonnte adalah jalan keluar agar pengembangan dan pembuktian alur percakapan bisa berjalan, bukan keputusan final untuk produksi besar. Keputusan provider produksi diambil ulang lewat ADR terpisah.
