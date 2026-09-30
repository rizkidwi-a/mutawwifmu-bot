# Handoff Sesi — Tiket 06 Siap untuk Pemilik, Lanjut Aksi Pemilik / Tiket 07

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan langkah berikutnya.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `bca8260` | Tiket 06 software selesai (`ready-for-human`): `npm run cutover:check` + tes cutover parity + dokumen kontak publik & batasan migrasi riwayat |
| `7159880` | Handoff sesi sebelumnya |
| `9b03e21` | Tiket 05 selesai (`resolved`): Harga Indikatif + penyempitan pola harga/ketersediaan + ADR-0005 |

Terakhir diverifikasi: **162 tes hijau**, `npm run typecheck` bersih.

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan di `src/conversation/types.ts`: `record-follow-up-request`,
  `record-faq-answer` (`topic: string`, nilai dari `FaqTopic` — termasuk topik
  Harga Indikatif `price-*`), `hand-off-to-admin` (payload `reason`, `request`, `history`).
- Routing pesan masuk: **satu sumber** `src/conversation/classifyInbound.ts`, hasil:
  `faq` / `indicative-price` (tiket 05) / `handoff` / `opener`. Urutan `nextState`/`step`
  yang teruji (JANGAN diubah — dilindungi `tests/conversation/followUpRequest.test.ts`,
  `handOffToAdmin.test.ts`, `handleInbound.test.ts` yang wajib hijau **tanpa diubah**):
  1. Resolusi persetujuan bila state menunggu (`ya`/`tidak`) → `idle`;
  2. Pemicu mendesak `{emergency, active-trip, human-request}` menyela apa pun → `awaiting-handoff-consent`;
  3. Bila `collecting` → isi slot berikutnya (klasifikasi diabaikan);
  4. Bila masih menunggu persetujuan → tetap;
  5. Routing `handoff` (non-mendesak) → `awaiting-handoff-consent`;
  6. `FOLLOW_UP_START` (tetap di `handleInbound`) → `collecting`;
  7. Di `step` untuk `idle`: `faq`/`indicative-price` → jawab dari materi; lainnya → sapaan awal.
- **Alur klasifikasi tiket 05 (lihat ADR-0005):** pola handoff darurat/booking/`unsupported-question`
  lebih dulu → `QUOTE_OR_AVAILABILITY_REQUEST` → pencocokan topik (topik `price-*` →
  `indicative-price`, kecuali satuan tak tercantum materi `UNVERIFIED_UNIT_REQUEST` mis. "per malam")
  → `CUSTOM_QUOTE_OR_AVAILABILITY` → `faq` → `unsupported-question`/`opener`.
- Modul pengetahuan: `src/knowledge/businessFaq.ts` (`matchFaqTopic`, `faqAnswer(topic, language)`,
  `isPriceTopic`, `FaqTopic` = 16 topik FAQ + 7 topik harga `price-*`). **Entri harga
  didahulukan** dalam `ENTRIES` sebelum entri layanan generik (jangan diacak).
- Metrik (`src/metrics.ts`): `faqAnswered` ikut menghitung jawaban Harga Indikatif (topik
  `price-*`) — wiring generik, tidak perlu perubahan metrik untuk tiket berikutnya.
- **Cutover nomor produksi (tiket 06):** identitas pengirim 100% dari konfigurasi
  (`src/config.ts`); `npm run cutover:check` (`src/cutoverPreflight.ts` + `src/cutoverCheck.ts`)
  menilai konfigurasi lengkap + nomor pengirim bukan nomor pengembangan `6289507003830`
  (exit 1 bila belum siap). Kesetaraan perilaku antar-nomor dijaga
  `tests/transport/cutoverParity.test.ts` (FAQ + handoff + metrik identik pada konfigurasi
  nomor produksi). Runbook lengkap + daftar permukaan kontak publik + batasan migrasi
  riwayat percakapan: `docs/whatsapp-number-cutover.md`.

## Aturan Harga Indikatif (tiket 05, jangan dilonggarkan)

- Setiap jawaban topik harga memuat "Harga Indikatif"/"Indicative Price" + "bukan penawaran
  final"/"not a final offer" + ajakan konfirmasi ke tim; **tanpa klaim harga final dan tanpa
  janji ketersediaan** (invarian `tests/knowledge/businessFaq.test.ts` berlaku untuk semua topik).
- `price-hotel` WAJIB menyatakan konflik satuan materi (per orang di sampul vs per kamar di
  tabel Makkah; Madinah kembali "per orang"), menyebut "belum terverifikasi", dan **tidak
  melabeli angka** sebagai per orang/per kamar.
- Angka yang tidak tercantum materi tidak boleh ditambahkan; pola harga memakai `PRICE_WORD`
  (tanpa "berapa" polos — "berapa lama" harus tetap `unsupported-question`).

## Pengaturan urutan entri di `businessFaq.ts` (jangan diacak)

- Entri `price-*` **di paling atas** (agar "Berapa harga fotografer?" → `price-photographer-videographer`).
- `price-transport` **sebelum** `price-airport-handling`.
- `tour-guide` **sebelum** entri city tour; `multi-language-support` **setelah** `mutawwif`.

## Jebakan yang sudah diketahui (jangan diulang)

- Kata `tersedia`/`available`/`penawaran`/`diskon` = handoff (`QUOTE_OR_AVAILABILITY_REQUEST`),
  bukan Harga Indikatif — dites di `tests/conversation/indicativePricing.test.ts`.
- Satuan tak tercantum materi ("per malam"/"per night") → handoff `custom-quote-or-availability`.
- "Berapa harga paket umrah?" / "Berapa harga tour guide?" → handoff (angka tidak tercantum materi).
- Kata `document` (kata kerja) jatuh ke `visa-documents`; dokumentasi perjalanan = "dokumentasi"/"photographer".
- Invarian groundedness melarang literal `harga final|final price|fixed price|dijamin tersedia`
  dan `\d+\s?(hari|days?|malam|nights?)` — disclaimer wajib "bukan penawaran final", jangan
  "bukan harga final"; jangan menulis "7–14 hari".
- Materi transportasi memuat **konflik mata uang** (tabel SAR, catatan kaki "IDR per grup") —
  disampaikan apa adanya; jangan memilih salah satunya.
- **Riwayat percakapan TIDAK berpindah antar nomor** (provider tidak mendukungnya) — jangan
  menjanjikan pemindahan riwayat; lihat `docs/whatsapp-number-cutover.md` bagian batasannya.
- Variabel yang sudah ada di shell **menimpa** isi `.env` saat `npm start` / `npm run cutover:check`.

## Sisa langkah

1. **Tiket 06 — aksi pemilik** (status `ready-for-human`; software sudah selesai):
   (a) miliki + verifikasi nomor produksi pada provider terpilih; (b) isi `.env`,
   jalankan `npm run cutover:check` sampai "siap", restart proses; (c) smoke test
   end-to-end via nomor produksi (balasan awal + FAQ + handoff dengan persetujuan);
   (d) perbarui informasi kontak publik (situs, Instagram, booklet) ke nomor aktif.
   Setelah dikonfirmasi, tinjau ulang tiket untuk `resolved`. **Nomor produksi belum
   diketahui sesi ini — jangan memakai `+62 877 4587 3159` sebagai nomor produksi
   kecuali kendalinya sudah pindah dan terverifikasi.**
2. **Gate pra-produksi (keputusan pemilik, JANGAN dikunci agent):** kanal penerimaan
   admin masih `LoggingAdminChannel` (sementara). Keputusan kanal final dicatat sebagai
   ADR sebelum handoff dipakai di produksi.
3. Tiket 07 — `07-bsp-provider-fallback.md` (kode selesai; status `needs-info`, menunggu
   keputusan kanal admin + penempatan proses bot di server dengan URL webhook stabil).

## Konvensi repo (wajib)

- Identifier privat di `src/` bahasa Inggris; komentar dan dokumen Bahasa Indonesia;
  helper tes boleh bahasa Indonesia (ikuti `tests/conversation/handleInbound.test.ts`).
- Tes memeriksa perilaku terlihat pada seam, bukan prompt internal/struktur privat.
- Issue tracker: `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`
  (lihat `docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md`); sisa aksi
  manusia → `ready-for-human` (preseden tiket 01).
- Perubahan yang bertentangan dengan ADR wajib dinyatakan eksplisit (ADR baru + catatan di
  ADR lama) — lihat ADR-0005 vs ADR-0004; jangan mengubah ADR diam-diam.

## Riwayat insiden (jangan diulang)

Sesi paralel yang dulu menulis tiket 03 sudah mati dan kerjanya diamanatkan di commit
`7566989`. Integrasi tiket 03 selesai pada sesi `ebd9ef5`; tiket 04 pada `02aed86`; tiket 05
pada `7159880`; software tiket 06 pada sesi ini (`bca8260`). Tidak ada proses paralel lain
yang diketahui berjalan saat handoff ini ditulis.
