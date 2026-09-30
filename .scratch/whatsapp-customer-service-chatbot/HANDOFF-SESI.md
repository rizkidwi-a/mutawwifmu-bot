# Handoff Sesi — Tiket 05 Selesai, Lanjut Tiket 06

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan tiket berikutnya.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `9b03e21` | Tiket 05 selesai (`resolved`): Harga Indikatif + penyempitan pola harga/ketersediaan + ADR-0005 |
| `02aed86` | Handoff sesi sebelumnya |
| `8b52c2e` | Tiket 04 selesai (`resolved`): 5 entri FAQ layanan lain profil |
| `fe184e8` | Refactor: `privatePremiumUmrahFaq.ts` → `businessFaq.ts` |

Terakhir diverifikasi: **152 tes hijau**, `npm run typecheck` bersih.

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan di `src/conversation/types.ts`: `record-follow-up-request`,
  `record-faq-answer` (`topic: string`, nilai dari `FaqTopic` — **termasuk topik
  Harga Indikatif `price-*`**), `hand-off-to-admin` (payload `reason`, `request`, `history`).
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
  lebih dulu → `QUOTE_OR_AVAILABILITY_REQUEST` (permintaan penawaran/promo/diskon/konfirmasi
  harga/ketersediaan) → pencocokan topik (topik `price-*` → `indicative-price`, kecuali pesan
  memuat satuan tak tercantum materi `UNVERIFIED_UNIT_REQUEST` mis. "per malam") →
  `CUSTOM_QUOTE_OR_AVAILABILITY` (sisa pertanyaan harga yang angkanya tak tercantum materi) →
  `faq` → `unsupported-question`/`opener`.
- Modul pengetahuan: `src/knowledge/businessFaq.ts` (`matchFaqTopic`, `faqAnswer(topic, language)`,
  `isPriceTopic`, tipe `FaqTopic` = 16 topik FAQ + 7 topik harga `price-*`). **Entri harga
  didahulukan** dalam `ENTRIES` sebelum entri layanan generik (jangan diacak).
- Metrik (`src/metrics.ts`): `faqAnswered` ikut menghitung jawaban Harga Indikatif
  (topik `price-*`) — wiring generik, tiket 06 tidak perlu perubahan metrik.

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

- Entri `price-*` **di paling atas** (agar "Berapa harga fotografer?" → `price-photographer-videographer`,
  bukan `photographer-videographer`; "Berapa harga city tour Madinah?" → `price-city-tour`).
- `price-transport` **sebelum** `price-airport-handling` (pesan "transportasi ... bandara" lebih tepat ke transport).
- `tour-guide` **sebelum** entri city tour; `multi-language-support` **setelah** `mutawwif`
  (menjaga tes "Do you provide bilingual worship guides?" → `mutawwif`).

## Jebakan yang sudah diketahui (jangan diulang)

- **Kata `tersedia`/`available`/`penawaran`/`diskon` = handoff** (`QUOTE_OR_AVAILABILITY_REQUEST`),
  bukan Harga Indikatif, meski angkanya tercantum materi — dites di
  `tests/conversation/indicativePricing.test.ts`.
- **Satuan tak tercantum materi ("per malam"/"per night") → handoff** `custom-quote-or-availability`;
  jangan menafsirkan jadi per orang/per kamar (kunci `tests/conversation/classifyInbound.test.ts`
  "How much is the hotel per night?").
- "Berapa harga paket umrah?" / "Berapa harga tour guide?" → handoff (angka tidak tercantum materi).
- Kata `document` (kata kerja) jatuh ke `visa-documents`; untuk dokumentasi perjalanan gunakan
  "dokumentasi"/"photographer" (tes `matchFaqTopic("Berapa harga dokumentasi perjalanan?")` menjaga ini).
- Invarian groundedness melarang literal `harga final|final price|fixed price|dijamin tersedia`
  dan `\d+\s?(hari|days?|malam|nights?)` — disclaimer wajib ditulis "bukan penawaran final",
  jangan "bukan harga final"; jangan menulis "7–14 hari".
- Materi transportasi memuat **konflik mata uang** (nilai tabel SAR, catatan kaki "IDR per grup")
  — sudah disampaikan apa adanya; jangan memilih salah satunya.

## Sisa langkah (TDD: tes merah dulu → implementasi; typecheck berkala; file tes tunggal
sering; full suite sekali di akhir; lalu `/code-review`; commit ke `main`)

1. **Tiket 06** — `06-production-number-cutover.md` (butuh akses nomor produksi dari pemilik;
   gate pra-produksi: jangan mengunci keputusan kanal admin — keputusan pemilik).
2. Tiket 07 — `07-bsp-provider-fallback.md` (setelah 06).

## Konvensi repo (wajib)

- Identifier privat di `src/` bahasa Inggris; komentar dan dokumen Bahasa Indonesia;
  helper tes boleh bahasa Indonesia (ikuti `tests/conversation/handleInbound.test.ts`).
- Tes memeriksa perilaku terlihat pada seam, bukan prompt internal/struktur privat.
- Issue tracker: `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`
  (lihat `docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md`).
- Perubahan yang bertentangan dengan ADR wajib dinyatakan eksplisit (ADR baru + catatan di
  ADR lama) — lihat ADR-0005 vs ADR-0004; jangan mengubah ADR diam-diam.

## Riwayat insiden (jangan diulang)

Sesi paralel yang dulu menulis tiket 03 sudah mati dan kerjanya diamanatkan di commit
`7566989`. Integrasi tiket 03 selesai pada sesi `ebd9ef5`; tiket 04 selesai pada sesi
`02aed86`; tiket 05 selesai pada sesi ini. Tidak ada proses paralel lain yang diketahui
berjalan saat handoff ini ditulis.
