# 01: Sambungkan WhatsApp melalui nomor pengembangan

**What to build:** Calon jemaah dapat mengirim pesan ke nomor WhatsApp pengembangan dan menerima balasan bot. Pengirim dikonfigurasi agar nomor produksi kelak dapat diganti tanpa mengubah perilaku percakapan.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

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

Sisa tindakan manusia (alasan status `ready-for-human`):

1. Verifikasi nomor pengembangan `+62 895 0700 3830` di WhatsApp Cloud API (akun Meta, WABA, OTP SMS/telepon) — langkah di `docs/whatsapp-number-cutover.md` bagian "Langkah verifikasi nomor pengembangan".
2. Isi kredensial nyata pada `.env` (Phone Number Id, access token, app secret, verify token) dan daftarkan URL webhook HTTPS publik.
3. Smoke test live: pesan ke nomor pengembangan harus dibalas bot end-to-end.

Catatan repo: direktori ini belum berupa git repo, sehingga diinisialisasi (`git init`, branch `main`) untuk memenuhi kewajiban commit.
