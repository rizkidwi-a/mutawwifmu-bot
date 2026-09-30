# 07: Adapter provider BSP (Fonnte) sebagai jalan keluar saat Meta for Developers tidak bisa diakses

**What to build:** Jalur integrasi WhatsApp tetap dapat dijalankan walau akun Meta for Developers tidak dapat dibuat, dengan provider baru yang dipilih lewat konfigurasi. Perilaku percakapan tidak boleh berubah.

**Blocked by:** 01 (transport provider sudah ada)

**Status:** ready-for-human

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

Sisa tindakan manusia (alasan status `ready-for-human`):

1. Daftar akun Fonnte dan hubungkan nomor `+62 895 0700 3830` sebagai perangkat; pastikan **auto read** aktif (tanpa itu webhook tidak terpanggil).
2. Isi `.env`: `WHATSAPP_PROVIDER=fonnte`, `WHATSAPP_SENDER_NUMBER`, `WHATSAPP_API_TOKEN` (token perangkat), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. `WHATSAPP_API_BASE_URL` dibiarkan kosong agar default Fonnte yang dipakai.
3. Daftarkan webhook di dashboard Fonnte: `https://<host-publik>/webhook?token=<token>`.
4. Smoke test live: pesan ke nomor pengembangan harus dibalas bot end-to-end.
5. Keputusan provider untuk produksi ditunda; Fonnte dipakai untuk membuktikan alur sampai akun Meta bisa diakses kembali.
