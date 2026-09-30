# Handoff Sesi — Besok: Cutover Nomor Produksi (Playbook Siap Jalan)

**Untuk sesi baru:** baca file ini lebih dulu. Pemilik akan mengerjakan cutover
mengikuti `docs/tutorial-cutover-nomor-produksi.md` (Fase 1–5, checklist
dicentang). Tugas sesi baru: jalankan **playbook di bagian "Alur esok hari"**
saat pemilik datang membawa hasil/ token nomor produksi.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `e523b1d` | Tutorial cutover untuk pemilik (`docs/tutorial-cutover-nomor-produksi.md`) + tautan README/runbook |
| `b5f8b92` | Handoff sesi sebelumnya |
| `fa30764` | Kanal admin WhatsApp (keputusan pemilik) + ADR-0006; `LoggingAdminChannel` dihapus; server menunggu hasil penerusan |
| `bca8260` | Tiket 06 software: `npm run cutover:check` + tes cutover parity + dokumen kontak publik & batasan migrasi riwayat |

Terakhir diverifikasi: **167 tes hijau**, `npm run typecheck` bersih.

## Keputusan pemilik yang sudah masuk (jangan ditanya ulang)

- **Nomor produksi: `+62 877 4587 3159`** (mantan nomor konsultasi profil). Sudah
  dicatat di runbook + tutorial; **swap `.env` BELUM dilakukan** karena token
  perangkat produksi belum ada.
- **Kanal admin: pesan WhatsApp ke `+62 822 8388 6627`** (`WHATSAPP_ADMIN_NUMBER`,
  wajib di konfigurasi, sudah di `.env`) — `WhatsAppAdminChannel`, ADR-0006.
  Gate pra-produksi kanal admin **tertutup**.

## Alur esok hari (playbook agent)

**Skenario utama — pemilik datang dengan token perangkat produksi** (kata kunci:
"token perangkat produksi", "lanjutkan cutover", "sudah sampai Fase 2"):

1. Edit `.env` — **hanya dua baris ini**:
   - `WHATSAPP_SENDER_NUMBER=+62 877 4587 3159`
   - `WHATSAPP_API_TOKEN=<token perangkat produksi dari pemilik>`
   - Jangan sentuh baris lain (termasuk `WHATSAPP_ADMIN_NUMBER` dan
     `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — terakhir ini bagian dari URL webhook yang
     sudah didaftarkan). Ingat jebakan: variabel shell **menimpa** `.env`
     (PowerShell: cek `$env:WHATSAPP_API_TOKEN`, `$env:WHATSAPP_SENDER_NUMBER`).
2. `npm run cutover:check` — wajib lapor **"Status: siap untuk uji end-to-end pada
   nomor produksi."**; bila belum, perbaiki sesuai baris `[GAGAL]` (biasanya nomor
   pengembangan masih tertinggal / token belum terbaca).
3. `npm test` + `npm run typecheck` — harus **167 hijau** dan bersih.
4. Minta pemilik menjalankan ulang `npm start` (atau jalankan bila prosesnya di
   tangan agent) — cek log: `nomor pengirim 6287745873159`.
5. Dampingi smoke test Fase 4 tutorial: pemilik mengirim pesan dari ponselnya
   ("Halo" → sapaan; "Apa itu land arrangement?" → FAQ; "Saya mau bicara dengan
   manusia saja" + "ya" → handoff masuk ke `+62 822 8388 6627`). Dari sisi agent:
   `curl http://localhost:3000/metrics` — `faqAnswered` dan `handOffsForwarded`
   naik; bila ada yang gagal, periksa log proses (jejak audit handoff ada di sana).
6. Bila semua lolos + pemilik mengonfirmasi kontak publik konsisten (Fase 5):
   centang checklist poin 1, 2, 4 di tiket 06, tambah komentar hasil, ubah
   `Status:` → `resolved`.

**Skenario lain:**

- Pemilik datang **tanpa token** (baru di tengah tutorial): lanjutkan dari fase
  tutorial yang tersisa; **jangan swap `.env` sebelum token perangkat produksi
  benar-benar ada** — swap parsial membuat bot mengaku nomor produksi tapi
  mengirim lewat perangkat lama.
- Pemilik hanya ingin **uji kanal admin dulu** (Fase 1 tutorial): cukup restart
  `npm start` (nomor admin sudah di `.env`) lalu alur "minta manusia" + "ya" dari
  nomor lain → pesan handoff harus muncul di `+62 822 8388 6627`.
- **Setelah tiket 06 `resolved`:** sisa penghalang hanya tiket 07
  (`needs-info`) — penempatan proses bot di server/VPS dengan URL webhook stabil;
  kerjakan bila pemilik menyiapkan VPS. Keputusan provider produksi diambil ulang
  lewat ADR (ADR-0003).

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan di `src/conversation/types.ts`: `record-follow-up-request`,
  `record-faq-answer` (`topic: string`, nilai dari `FaqTopic` — termasuk `price-*`),
  `hand-off-to-admin` (payload `reason`, `request`, `history`).
- Routing pesan masuk: **satu sumber** `src/conversation/classifyInbound.ts`, hasil:
  `faq` / `indicative-price` / `handoff` / `opener`. Urutan `nextState`/`step` yang
  teruji (JANGAN diubah — dilindungi `tests/conversation/followUpRequest.test.ts`,
  `handOffToAdmin.test.ts`, `handleInbound.test.ts` yang wajib hijau **tanpa diubah**):
  1. Resolusi persetujuan bila state menunggu (`ya`/`tidak`) → `idle`;
  2. Pemicu mendesak `{emergency, active-trip, human-request}` menyela apa pun → `awaiting-handoff-consent`;
  3. Bila `collecting` → isi slot berikutnya (klasifikasi diabaikan);
  4. Bila masih menunggu persetujuan → tetap;
  5. Routing `handoff` (non-mendesak) → `awaiting-handoff-consent`;
  6. `FOLLOW_UP_START` (tetap di `handleInbound`) → `collecting`;
  7. Di `step` untuk `idle`: `faq`/`indicative-price` → jawab dari materi; lainnya → sapaan awal.
- **Alur klasifikasi tiket 05 (ADR-0005):** pola handoff darurat/booking/`unsupported-question`
  lebih dulu → `QUOTE_OR_AVAILABILITY_REQUEST` → pencocokan topik (topik `price-*` →
  `indicative-price`, kecuali satuan tak tercantum materi `UNVERIFIED_UNIT_REQUEST`) →
  `CUSTOM_QUOTE_OR_AVAILABILITY` → `faq` → `unsupported-question`/`opener`.
- Modul pengetahuan: `src/knowledge/businessFaq.ts` (`matchFaqTopic`, `faqAnswer(topic, language)`,
  `isPriceTopic`, `FaqTopic` = 16 topik FAQ + 7 topik harga `price-*`). **Entri harga
  didahulukan** dalam `ENTRIES` sebelum entri layanan generik (jangan diacak).
- **Kanal admin (ADR-0006):** `src/adminChannel.ts` — `WhatsAppAdminChannel(sender, adminNumber)`
  mencatat isi handoff ke log proses (jejak audit) lalu `sender.sendText(adminNumber, text)`.
  `AdminChannel.deliver` boleh `void | Promise<void>` dan **wajib ditunggu** pemanggil —
  `src/server.ts` `runActions` sudah `await`; jangan kembalikan ke pola tanpa-`await`
  (rejection async bisa lolos → klaim palsu + metrik salah).
- Konfigurasi (`src/config.ts`): `WHATSAPP_SENDER_NUMBER`, `WHATSAPP_ADMIN_NUMBER`
  (wajib, ternormalisasi E.164), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, plus kredensial
  per provider (`WHATSAPP_PROVIDER`: `whatsapp-cloud-api` / `fonnte`).
  `npm run cutover:check` (`src/cutoverPreflight.ts`) menilai kelengkapan + memastikan
  nomor pengirim bukan nomor pengembangan `6289507003830`.
- Metrik (`src/metrics.ts`): `faqAnswered` ikut menghitung jawaban harga (`price-*`);
  `handOffsForwarded` hanya naik bila penerusan benar-benar berhasil.

## Aturan Harga Indikatif (tiket 05, jangan dilonggarkan)

- Setiap jawaban topik harga memuat "Harga Indikatif"/"Indicative Price" + "bukan penawaran
  final"/"not a final offer" + ajakan konfirmasi ke tim; tanpa klaim harga final dan tanpa
  janji ketersediaan (invarian `tests/knowledge/businessFaq.test.ts`).
- `price-hotel` WAJIB menyatakan konflik satuan materi (per orang di sampul vs per kamar di
  tabel Makkah; Madinah kembali "per orang"), menyebut "belum terverifikasi", dan tidak
  melabeli angka sebagai per orang/per kamar.
- Angka yang tidak tercantum materi tidak boleh ditambahkan; pola harga memakai `PRICE_WORD`
  (tanpa "berapa" polos — "berapa lama" harus tetap `unsupported-question`).

## Pengaturan urutan entri di `businessFaq.ts` (jangan diacak)

- Entri `price-*` **di paling atas**; `price-transport` **sebelum** `price-airport-handling`;
  `tour-guide` **sebelum** entri city tour; `multi-language-support` **setelah** `mutawwif`.

## Jebakan yang sudah diketahui (jangan diulang)

- Kata `tersedia`/`available`/`penawaran`/`diskon` = handoff (`QUOTE_OR_AVAILABILITY_REQUEST`), bukan Harga Indikatif.
- Satuan tak tercantum materi ("per malam"/"per night") → handoff `custom-quote-or-availability`.
- "Berapa harga paket umrah?" / "Berapa harga tour guide?" → handoff (angka tidak tercantum materi).
- Kata `document` (kata kerja) jatuh ke `visa-documents`; dokumentasi perjalanan = "dokumentasi"/"photographer".
- Invarian groundedness melarang literal `harga final|final price|fixed price|dijamin tersedia`
  dan `\d+\s?(hari|days?|malam|nights?)` — disclaimer wajib "bukan penawaran final".
- Materi transportasi memuat konflik mata uang (tabel SAR, catatan kaki "IDR per grup") —
  disampaikan apa adanya; jangan memilih salah satunya.
- **Riwayat percakapan TIDAK berpindah antar nomor** (provider tidak mendukungnya) — jangan
  menjanjikan pemindahan riwayat.
- Variabel yang sudah ada di shell **menimpa** isi `.env` saat `npm start` / `npm run cutover:check`.
- Saat menambah variabel konfigurasi wajib: fixture tes ikut diperbarui (tests/config,
  tests/cutoverPreflight, tests/transport/*) — preseden `WHATSAPP_ADMIN_NUMBER`.
- Fonnte: tanpa **Auto Read** webhook tidak pernah dipanggil; URL webhook berubah bila
  tunnel berubah → daftarkan ulang.

## Konvensi repo (wajib)

- Identifier privat di `src/` bahasa Inggris; komentar dan dokumen Bahasa Indonesia;
  helper tes boleh bahasa Indonesia.
- Tes memeriksa perilaku terlihat pada seam, bukan prompt internal/struktur privat.
- Issue tracker: `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`
  (lihat `docs/agents/triage-labels.md`); sisa aksi manusia → `ready-for-human`.
- Perubahan yang bertentangan dengan ADR wajib dinyatakan eksplisit (ADR baru + catatan di
  ADR lama) — jangan mengubah ADR diam-diam.
- Selesai kerja: `/code-review` dulu, baru commit ke `main`; perbarui file handoff ini
  sebagai commit `docs(handoff)` terpisah.

## Riwayat insiden (jangan diulang)

- Sesi paralel yang menulis tiket 03 sudah mati; kerjanya diamanatkan di `7566989`.
- Tiket 03 selesai di `ebd9ef5`; tiket 04 di `02aed86`; tiket 05 di `7159880`; software
  tiket 06 di `bca8260`; kanal admin di `fa30764`; tutorial pemilik di `e523b1d`.
- Jebakan yang sudah diperbaiki: `runActions` tidak menunggu `deliver` async → rejection
  lolos dari try/catch dan balasan mengklaim "diteruskan" palsu. Sudah diperbaiki + diuji
  (`tests/transport/adminHandoffDelivery.test.ts`) — jangan dikembalikan.
- Tidak ada proses paralel lain yang diketahui berjalan saat handoff ini ditulis.
