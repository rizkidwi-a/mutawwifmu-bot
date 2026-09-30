# Handoff Sesi — Tiket 06 Menunggu Verifikasi Nomor Produksi di Provider

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan langkah berikutnya.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `fa30764` | Kanal admin WhatsApp (keputusan pemilik) + ADR-0006; `LoggingAdminChannel` dihapus; server menunggu hasil penerusan |
| `a6c2c83` | Handoff sesi sebelumnya |
| `bca8260` | Tiket 06 software (`ready-for-human`): `npm run cutover:check` + tes cutover parity + dokumen kontak publik & batasan migrasi riwayat |
| `7159880` | Handoff; tiket 05 selesai sebelumnya (`9b03e21`) |

Terakhir diverifikasi: **167 tes hijau**, `npm run typecheck` bersih.

## Keputusan pemilik yang sudah masuk (jangan ditanya ulang)

- **Nomor produksi: `+62 877 4587 3159`** (mantan nomor konsultasi profil; pemilik
  menetapkannya sebagai nomor produksi). Sudah dicatat di runbook; **swap konfigurasi
  `.env` BELUM dilakukan** karena token/identitas provider untuk nomor ini belum ada.
- **Kanal admin: pesan WhatsApp ke `+62 822 8388 6627`** (`WHATSAPP_ADMIN_NUMBER`,
  wajib di konfigurasi) — diimplementasikan `WhatsAppAdminChannel`, dicatat di
  `docs/adr/0006-kanal-admin-whatsapp.md`. Gate pra-produksi kanal admin **tertutup**.

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
  (rejection async bisa lolos dan menghasilkan klaim palsu + metrik salah).
- Konfigurasi (`src/config.ts`): `WHATSAPP_SENDER_NUMBER`, `WHATSAPP_ADMIN_NUMBER`
  (keduanya wajib, ternormalisasi E.164), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, plus
  kredensial per provider (`WHATSAPP_PROVIDER`: `whatsapp-cloud-api` / `fonnte`).
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

## Sisa langkah

1. **Tiket 06 — verifikasi nomor produksi di provider (aksi pemilik):**
   (a) hubungkan `+62 877 4587 3159` ke Fonnte sebagai perangkat (QR/Sinkit, auto read ON,
   daftarkan URL webhook) atau jalur WABA bila memakai Cloud API; (b) berikan token/identitas
   perangkat barunya ke agent → agent swap `.env` (`WHATSAPP_SENDER_NUMBER` + token),
   jalankan `npm run cutover:check` sampai "siap", restart proses; (c) smoke test end-to-end
   (balasan awal + FAQ + handoff ke `+62 822 8388 6627` + metrik); (d) pastikan permukaan
   kontak publik konsisten (nomor produksi = nomor yang sudah tercantum di materi).
   Setelah itu tiket 06 dapat `resolved`.
2. **Tes kanal admin bisa dimulai sekarang** (tanpa cutover): restart proses bot agar
   `WHATSAPP_ADMIN_NUMBER` termuat, kirim "Saya mau bicara dengan manusia" ke nomor
   pengembangan, jawab `ya`, lalu cek pesan handoff masuk ke nomor admin.
3. **Tiket 07** (`needs-info`) — sisa penghalang: penempatan proses bot di server/VPS
   dengan URL webhook stabil. Keputusan provider produksi diambil ulang lewat ADR (ADR-0003).

## Konvensi repo (wajib)

- Identifier privat di `src/` bahasa Inggris; komentar dan dokumen Bahasa Indonesia;
  helper tes boleh bahasa Indonesia.
- Tes memeriksa perilaku terlihat pada seam, bukan prompt internal/struktur privat.
- Issue tracker: `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`
  (lihat `docs/agents/triage-labels.md`); sisa aksi manusia → `ready-for-human`.
- Perubahan yang bertentangan dengan ADR wajib dinyatakan eksplisit (ADR baru + catatan di
  ADR lama) — jangan mengubah ADR diam-diam.

## Riwayat insiden (jangan diulang)

- Sesi paralel yang menulis tiket 03 sudah mati; kerjanya diamanatkan di `7566989`.
- Tiket 03 selesai di `ebd9ef5`; tiket 04 di `02aed86`; tiket 05 di `7159880`; software
  tiket 06 di `bca8260`; kanal admin di sesi ini (`fa30764`).
- Jebakan yang sudah diperbaiki: `runActions` tidak menunggu `deliver` async → rejection
  lolos dari try/catch dan balasan mengklaim "diteruskan" palsu. Sudah diperbaiki + diuji
  (`tests/transport/adminHandoffDelivery.test.ts`) — jangan dikembalikan.
- Tidak ada proses paralel lain yang diketahui berjalan saat handoff ini ditulis.
