# Handoff Sesi — Tiket 04 Selesai, Lanjut Tiket 05

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan tiket berikutnya.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `fe184e8` | Refactor: rename `src/knowledge/privatePremiumUmrahFaq.ts` → `src/knowledge/businessFaq.ts` (tipe `UmrahFaqTopic` → `FaqTopic`); perilaku tidak berubah, path ADR-0004 diselaraskan |
| 8b52c2e | Tiket 04 selesai (`resolved`): 5 entri FAQ layanan lain profil + tes seam & knowledge + README |
| `0703405` | Handoff sesi sebelumnya |

Terakhir diverifikasi: **134 tes hijau**, `npm run typecheck` bersih.

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan di `src/conversation/types.ts`: `record-follow-up-request`,
  `record-faq-answer` (`topic: string`, nilai dari `FaqTopic`),
  `hand-off-to-admin` (payload `reason: HandOffReason`, `request`, `history`).
- Routing pesan masuk: **satu sumber** `src/conversation/classifyInbound.ts`
  (`faq`/`handoff`/`opener`). Urutan `nextState`/`step` yang teruji (JANGAN diubah
  — dilindungi `tests/conversation/followUpRequest.test.ts`, `handOffToAdmin.test.ts`,
  `handleInbound.test.ts` yang wajib hijau **tanpa diubah**):
  1. Resolusi persetujuan bila state menunggu (`ya`/`tidak`) → `idle`;
  2. Pemicu mendesak `{emergency, active-trip, human-request}` menyela apa pun
     (termasuk saat pengumpulan) → `awaiting-handoff-consent`;
  3. Bila `collecting` → isi slot berikutnya (klasifikasi diabaikan);
  4. Bila masih menunggu persetujuan → tetap (balasan meminta konfirmasi ulang);
  5. Routing `handoff` (non-mendesak) → `awaiting-handoff-consent` (`reason` = trigger);
  6. `FOLLOW_UP_START` (tetap di `handleInbound` — intent konsultasi) → `collecting`;
  7. Di `step` untuk `idle`: routing `faq` → jawab FAQ; `opener`/lainnya → sapaan awal.
- Modul pengetahuan: `src/knowledge/businessFaq.ts` (`matchFaqTopic`,
  `faqAnswer(topic, language)`, tipe `FaqTopic`; **16 topik**: 11 dari tiket 03 +
  `tour-guide`, `charity-program`, `multi-language-support`,
  `photographer-videographer`, `custom-itinerary` dari tiket 04). Modul pendukung:
  `src/conversation/language.ts` (`detectLanguage`, `resolveReplyLanguage(history, text)`).
- Metrik (`src/metrics.ts`, `GET /metrics`): `followUpRequestsRecorded`,
  `followUpRequestsForwarded`, `handOffsForwarded`, `faqAnswered` — wiring generik,
  topik FAQ baru tidak perlu perubahan metrik.

## Pengaturan urutan entri di `businessFaq.ts` (jangan diacak)

- `tour-guide` **sebelum** entri city tour: pola `tour guides?` lebih spesifik daripada
  `tour`; city tour per destinasi tetap menang untuk "City tour di Madinah ...".
- `multi-language-support` **setelah** `mutawwif`: "Do you provide bilingual worship
  guides?" harus tetap terjawab `mutawwif` (pola multibahasa mengandung `bilingual`).
- Tes `tests/knowledge/businessFaq.test.ts` ("mengenali city tour per destinasi lebih
  dahulu", "Apakah ada mutawwif yang bisa berbahasa Arab?" → `mutawwif`) menjaga urutan ini.

## Jebakan yang sudah diketahui (jangan diulang)

- **Jangan panggil `matchFaqTopic` tanpa cek pola handoff.** "Berapa harga hotel di
  Mekkah?" dan "Apakah tersedia city tour?" cocok topik FAQ di level knowledge, tetapi
  `classifyInbound` mendahulukan pola handoff (`custom-quote-or-availability`).
- Kata `tersedia`/`available`/`harga`/`price` pada pesan = routing handoff, bukan FAQ —
  tes FAQ tidak boleh memuat kata tersebut pada pesannya.
- Kata `document` (kata kerja) jatuh ke topik `visa-documents`; untuk pertanyaan
  dokumentasi perjalanan gunakan "dokumentasi"/"photographer" pada tes dan pola.
- Jawaban FAQ tidak boleh memuat angka harga final; **tiket 05 justru akan mengizinkan
  angka harga sebagai Harga Indikatif** — lihat "Pekerjaan tiket 05" di bawah.

## Pekerjaan tiket 05 (baca dulu sebelum mengubah apapun)

Tiket 05 = `.scratch/whatsapp-customer-service-chatbot/issues/05-transparent-indicative-pricing.md`.
Materi harga ada di `BOOKLET MUTAWWIFMU.md` (mutawwif per grup, dokumen per pax, airport
handling, transportasi per grup, city tour, fotografi/videografi) dan
`HOTEL RATES MUTAWWIFMU (2).md` (daftar hotel dengan **konflik satuan**: per orang di
sampul, per kamar di tabel — wajib disampaikan sebagai hal belum terverifikasi).

Batas sadar yang harus diubah **secara sadar** oleh tiket 05 (saat ini dijaga tes):

1. `tests/conversation/otherProfileServicesFaq.test.ts` — tes "pertanyaan harga layanan
   lain tidak dijawab sebagai FAQ ... tetap ke alur admin" mengunci routing
   `custom-quote-or-availability` untuk semua pertanyaan harga. Tiket 05 harus
   mendistingsi: pertanyaan angka harga yang tercantum materi → jawab Harga Indikatif;
   permintaan penawaran khusus / konfirmasi harga / ketersediaan → tetap handoff.
2. `tests/knowledge/businessFaq.test.ts` — invarian "jawaban tidak memuat angka harga"
   (`/(SAR|IDR|Rp)\s?\d/`) atas `SEMUA_TOPIK` harus dilonggarkan untuk topik harga;
   invarian "tanpa klaim harga final / tanpa durasi karangan" dipertahankan.
3. Pola `CUSTOM_QUOTE_OR_AVAILABILITY` di `classifyInbound.ts` perlu penyempitan;
   perubahan itu menyentuh logika klasifikasi — **nyatakan eksplisit hubungannya dengan
   ADR-0004** (jangan diubah diam-diam) dan pastikan tes
   `tests/conversation/classifyInbound.test.ts` yang ada tetap hijau.

## Sisa langkah (TDD: tes merah dulu → implementasi; typecheck berkala; file tes tunggal
sering; full suite sekali di akhir; lalu `/code-review`; commit ke `main`)

1. **Tiket 05** — `05-transparent-indicative-pricing.md` (lihat bagian sebelumnya).
2. **Tiket 06** — `06-production-number-cutover.md` (butuh akses nomor produksi dari pemilik).

## Konvensi repo (wajib)

- Identifier privat di `src/` bahasa Inggris (lihat commit `56d196c`); komentar dan
  dokumen Bahasa Indonesia; helper tes boleh bahasa Indonesia (ikuti
  `tests/conversation/handleInbound.test.ts`).
- Tes memeriksa perilaku terlihat pada seam, bukan prompt internal/struktur privat.
- Issue tracker: `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`
  (lihat `docs/agents/triage-labels.md`, `docs/agents/issue-tracker.md`).
- Jangan mengunci keputusan infrastruktur: kanal admin final adalah keputusan pemilik
  (gate pra-produksi, terkait tiket 06).

## Riwayat insiden (jangan diulang)

Sesi paralel yang dulu menulis tiket 03 sudah mati dan kerjanya diamanatkan di commit
`7566989`. Integrasi tiket 03 selesai pada sesi `ebd9ef5`; tiket 04 selesai pada sesi
ini (commit `fe184e8` + commit tiket 04). Tidak ada proses paralel lain yang diketahui
berjalan saat handoff ini ditulis.
