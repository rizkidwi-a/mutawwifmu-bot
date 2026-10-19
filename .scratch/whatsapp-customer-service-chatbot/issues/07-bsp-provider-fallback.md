# 07: Adapter provider BSP (Fonnte) sebagai jalan keluar saat Meta for Developers tidak bisa diakses

**What to build:** Jalur integrasi WhatsApp tetap dapat dijalankan walau akun Meta for Developers tidak dapat dibuat, dengan provider baru yang dipilih lewat konfigurasi. Perilaku percakapan tidak boleh berubah.

**Blocked by:** 01 (transport provider sudah ada)

**Status:** needs-info

Pekerjaan kode selesai dan terverifikasi. Sisa pekerjaan memerlukan keputusan manusia, sehingga tiket menunggu: (a) kanal penerimaan handoff admin untuk tiket 02, (b) penempatan proses bot di server dengan URL webhook stabil. Keduanya tidak bisa diputuskan agent.

- [x] Keputusan provider BSP alternatif tercatat sebagai ADR, berikut konsekuensi dan alasan penolakan kandidat lain.
- [x] Adapter pengirim pesan dan pembacaan webhook untuk provider baru ada di `src/adapters/`, tanpa menambah dependency runtime.
- [x] Provider dipilih lewat konfigurasi; `WHATSAPP_PROVIDER` yang berbeda memilih kredensial yang wajib diisi, dan provider yang tidak dikenal ditolak dengan pesan yang menyebut pilihannya.
- [x] Server dan seam percakapan tetap provider-agnostic; hanya satu titik pemilihan adapter yang berubah.
- [x] Tes adapter dan tes transport end-to-end untuk provider baru hijau, termasuk penolakan permintaan webhook yang tidak sah.
- [x] Runbook onboarding provider baru ditulis, termasuk kebutuhan auto read dan cara melindungi endpoint webhook.

## Comments

### Implementasi tiket 07 (agent)

Konteks: pemilik akun tidak dapat membuat akun Meta for Developers, sehingga nomor pengembangan tidak bisa didaftarkan ke WABA maupun diverifikasi lewat OTP.

Keputusan yang dicatat:

- `docs/adr/0003-provider-bsp-fonnte.md` — Fonnte dipilih sebagai BSP alternatif; Cloud API tetap dipertahankan sebagai pilihan, jadi kunci vendor dibatasi.

Hasil kerja:

- Port baru `src/inboundTransport.ts` supaya server tidak lagi tahu bentuk payload provider. Server kini hanya mengurus HTTP; autentikasi dan parsing berada di adapter. Cloud API dan Fonnte masing-masing mengimplementasikan port itu, dipilih lewat `src/adapters/factory.ts`.
- `src/adapters/fonnte/sender.ts` — `POST /send` dengan header `Authorization` berisi token perangkat. Fonnte membalas HTTP 200 meski menolak, jadi keberhasilan dibaca dari field `status` (kapitalisasi tidak konsisten di dokumentasi, jadi dibaca case-insensitive). Respons tanpa status yang jelas dianggap gagal agar pesan hilang tidak dianggap terkirim.
- `src/adapters/fonnte/webhook.ts` — payload Fonnte datar, tanpa tanda tangan dan tanpa handshake. Endpoint dilindungi token yang disisipkan pada URL (`?token=...` atau segmen path terakhir). Status perangkat dan status pengiriman ke endpoint yang sama tidak menghasilkan pesan masuk; pengirim grup (`...@g.us`) diabaikan karena percakapan grup tidak boleh dijawab otomatis.
- `src/config.ts` — `WhatsAppConfig` menjadi union `whatsapp-cloud-api | fonnte` sehingga hanya kredensial provider terpilih yang wajib diisi. Nomornya sendiri tidak berubah sumbernya.
- Dokumentasi: `.env.example`, `README.md`, dan `docs/whatsapp-number-cutover.md` (bagian Fonnte).

Tes: 45 tes hijau (`npm test`), `npm run typecheck` bersih. Tes baru: 5 tes pengirim Fonnte, 8 tes webhook Fonnte, 4 tes konfigurasi provider, 5 tes transport end-to-end Fonnte.

Temuan saat verifikasi lokal (setelah kredensial diisi dan verifikasi lokal dijalankan):

- `npm start` ternyata tidak pernah membaca `.env` — tidak ada pemuat environment dan `start` tidak memakai flag Node. Diperbaiki dengan `--env-file-if-exists=.env`. Konsekuensi yang perlu diingat: variabel yang sudah ada di shell **menimpa** isi `.env`, jadi nilai yang salah sering muncul dari sana, bukan dari `.env`.
- Kegagalan di `src/server.ts` ditangkap tanpa log sehingga penolakan provider tidak terlihat. Sekarang error dicatat ke log proses; respons ke pemanggil tetap `500 {"error":"internal"}` agar isi provider tidak bocor ke luar.
- `WHATSAPP_API_BASE_URL` pada `.env` masih mengarah ke domain Meta; sudah dinonaktifkan agar default per provider (`https://api.fonnte.com`) yang dipakai.

Sisa tindakan manusia:

1. ~~Daftar akun Fonnte dan hubungkan nomor `+62 895 0700 3830`~~ — selesai. Awalnya gagal karena perangkat berstatus `disconnected`: nomor tersebut belum terdaftar di WhatsApp, jadi tidak ada QR yang bisa dipindai. Setelah nomor didaftarkan ke WhatsApp dan devices ditautkan, `POST /validate` membalas `registered: ["6289507003830"]` dan pengiriman masuk antrean dengan kuota terpakai 1 dari 999.
2. ~~Isi `.env`~~ — selesai.
3. ~~Daftarkan webhook di dashboard Fonnte~~ — selesai (Auto Read ON + URL webhook dengan token).
4. ~~Smoke test live~~ — selesai: pesan dari nomor lain mendapat balasan bot, ditandai "Sent via Fonnte" di WhatsApp.
5. Keputusan provider untuk produksi ditunda; Fonnte dipakai untuk membuktikan alur sampai akun Meta bisa diakses kembali.
6. Sebelum handoff ke produksi, proses bot harus dipindah ke server/VPS dengan domain sendiri: quick tunnel tidak punya jaminan uptime dan URL-nya berubah setiap restart, sedangkan URL webhook di Fonnte harus stabil.

### Pembaruan: (a) kanal admin sudah diputuskan (agent)

Pemilik memutuskan kanal penerimaan handoff: **pesan WhatsApp ke `+62 822 8388 6627`** (`WHATSAPP_ADMIN_NUMBER`) — dicatat di `docs/adr/0006-kanal-admin-whatsapp.md` dan diimplementasikan `WhatsAppAdminChannel`. Sisa penghalang tiket ini tinggal **(b) penempatan proses bot di server/VPS dengan URL webhook stabil**. Konsekuensi untuk tiket ini: `LoggingAdminChannel` sudah dihapus; adapter Fonnte tetap menjadi jalur aktif sampai keputusan provider produksi diambil ulang (lihat ADR-0003).
