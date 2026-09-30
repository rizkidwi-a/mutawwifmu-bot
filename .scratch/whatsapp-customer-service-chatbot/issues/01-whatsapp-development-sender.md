# 01: Sambungkan WhatsApp melalui nomor pengembangan

**What to build:** Calon jemaah dapat mengirim pesan ke nomor WhatsApp pengembangan dan menerima balasan bot. Pengirim dikonfigurasi agar nomor produksi kelak dapat diganti tanpa mengubah perilaku percakapan.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Provider integrasi dipilih dan nomor pengembangan `+62 895 0700 3830` dapat menerima serta mengirim pesan setelah verifikasi yang diperlukan.
- [x] Pesan masuk menghasilkan balasan awal yang aman melalui WhatsApp secara end-to-end.
- [x] Proses bot dapat berjalan setiap saat; ketersediaan balasan otomatis tidak bergantung pada jam kerja admin.
- [x] Nomor pengirim dan identitas provider dapat diganti melalui konfigurasi, bukan tertanam pada perilaku percakapan.
- [x] Jalur penggantian nomor ke nomor produksi dijelaskan, termasuk langkah verifikasi provider yang diperlukan.
- [x] Pengujian transport membuktikan pesan masuk dan balasan keluar melalui kanal provider tanpa menggantikan tes perilaku pada seam percakapan yang disepakati.

## Comments

### Implementasi tiket 01 (agent)

Keputusan yang dicatat:

- `docs/adr/0001-provider-whatsapp-cloud-api.md` — provider: WhatsApp Cloud API (Meta).
- `docs/adr/0002-runtime-node-typescript.md` — Node.js + TypeScript tanpa dependency runtime; tes `node:test`.

Hasil kerja:

- Seam percakapan yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan → balasan + tindakan terlihat, provider-agnostic). Tiket ini baru menghasilkan balasan awal yang aman: menyebut asisten otomatis, menyatakan ketersediaan kapan saja, tanpa janji waktu balasan admin, tanpa pembicaraan transaksi. Balasan mengikuti bahasa pengirim (ID/EN), sekaligus melengkapi user story 3–5 yang tidak punya tiket tersendiri. Konteks percakapan selalu kosong karena mekanisme penyimpanan belum diputuskan sesuai spec.
- Transport WhatsApp Cloud API: `src/adapters/whatsapp-cloud/` (handshake verifikasi webhook, pemeriksaan tanda tangan `X-Hub-Signature-256`, parsing payload provider, pengiriman via Graph API) + `src/server.ts`/`src/main.ts` sebagai proses yang berjalan setiap saat.
- Nomor pengirim dan identitas provider dari environment (`src/config.ts`, `.env.example`); pesan dari nomor bot sendiri diabaikan agar tidak membalas diri sendiri.
- Jalur verifikasi nomor pengembangan dan cutover ke nomor produksi: `docs/whatsapp-number-cutover.md`.
- Tes: 23 tes hijau (`npm test`) — perilaku pada seam percakapan + kontrak/transport yang membuktikan pesan masuk dan balasan keluar melalui kanal provider (webhook masuk → API keluar pada server provider palsu), tanpa menggantikan tes perilaku seam. `npm run typecheck` bersih.

Sisa tindakan manusia saat tiket ini pertama selesai diimplementasikan (alasan status `ready-for-human` pada waktu itu; telah diselesaikan — lihat komentar di bawah):

1. Verifikasi nomor pengembangan `+62 895 0700 3830` di WhatsApp Cloud API (akun Meta, WABA, OTP SMS/telepon) — langkah di `docs/whatsapp-number-cutover.md` bagian "Langkah verifikasi nomor pengembangan".
2. Isi kredensial nyata pada `.env` (Phone Number Id, access token, app secret, verify token) dan daftarkan URL webhook HTTPS publik.
3. Smoke test live: pesan ke nomor pengembangan harus dibalas bot end-to-end.

Catatan repo: direktori ini belum berupa git repo, sehingga diinisialisasi (`git init`, branch `main`) untuk memenuhi kewajiban commit.

### Sinkronisasi provider: Fonnte menggantikan jalur Meta (agent)

Konteks baru: pemilik akun tidak dapat membuat akun Meta for Developers, sehingga verifikasi nomor via OTP Meta tidak dapat dijalankan. Jalur provider dialihkan:

- `docs/adr/0003-provider-bsp-fonnte.md` — Fonnte (BSP) ditambahkan sebagai provider aktif lewat konfigurasi; Cloud API dipertahankan sebagai pilihan (lihat juga tiket 07).
- Konsekuensi untuk tiket ini: poin "provider integrasi dipilih" kini terpenuhi lewat Fonnte; sisa langkah verifikasi berubah dari OTP Meta menjadi onboarding Fonnte — daftar akun, hubungkan nomor `+62 895 0700 3830` sebagai perangkat, aktifkan **auto read**, daftarkan URL webhook `https://<host>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>`. Langkah lengkap: `docs/whatsapp-number-cutover.md` bagian Fonnte.
- Kriteria penerimaan tiket ini tidak berubah: perilaku percakapan tetap di seam yang sama dan provider-agnostic; hanya transport yang berganti. Tes dijalankan ulang setelah migrasi: **45 tes hijau**, `npm run typecheck` bersih.
- Status kini `resolved`: onboarding Fonnte dan smoke test live selesai — lihat komentar berikut. Bila kelak akun Meta dapat diakses, jalur Cloud API tetap tersedia tanpa perubahan kode.

### Tiket 01 dinyatakan selesai (agent)

Smoke test live dikonfirmasi pengguna: jalur pesan ke nomor pengembangan `+62 895 0700 3830` lewat Fonnte berfungsi. Pada saat pemeriksaan: proses bot aktif (provider `fonnte`), tunnel publik hidup, probe `POST /webhook?token=...` membalas `200 {"status":"ok"}`, permintaan tanpa/token salah ditolak `401`, dan `npm test` 45 hijau. Seluruh kriteria penerimaan tiket ini terpenuhi — Status `resolved`, sehingga tiket 02 dan seterusnya resmi tidak terblokir.
