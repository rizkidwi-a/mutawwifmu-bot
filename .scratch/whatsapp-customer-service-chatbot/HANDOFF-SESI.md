# Handoff Sesi — Tiket 03 Selesai, Lanjut Tiket 04

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan tiket berikutnya.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `7566989` | Modul tiket 03 dari sesi paralel (knowledge FAQ + `classifyInbound` + `language.ts` + tesnya) |
| `27ff422` | Fix 3 celah `classifyInbound` (sapaan basa-basi, "hubungkan saya dengan admin", "memesan") |
| `e28b78c` | Handoff sesi sebelumnya |
| `ebd9ef5` | Tiket 03 selesai (`resolved`): FAQ pada seam + `record-faq-answer` + `classifyInbound` sebagai satu sumber klasifikasi + `resolveReplyLanguage` + metrik `faqAnswered` + wiring `runActions` + README |

Terakhir diverifikasi: **121 tes hijau**, `npm run typecheck` bersih.

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan di `src/conversation/types.ts`: `record-follow-up-request`,
  `record-faq-answer` (`topic: string`, nilai dari `UmrahFaqTopic`),
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
- Modul pendukung: `src/knowledge/privatePremiumUmrahFaq.ts` (`matchFaqTopic`,
  `faqAnswer(topic, language)`; 11 topik) dan `src/conversation/language.ts`
  (`detectLanguage`, `resolveReplyLanguage(history, text)` — penanda lebar + fallback
  bahasa percakapan dari riwayat).
- Metrik (`src/metrics.ts`, `GET /metrics`): `followUpRequestsRecorded`,
  `followUpRequestsForwarded`, `handOffsForwarded`, `faqAnswered`.

## Jebakan yang sudah diketahui (jangan diulang)

- **Jangan panggil `matchFaqTopic` tanpa cek pola handoff.** "Berapa harga hotel di
  Mekkah?" dan "Apakah tersedia city tour?" cocok topik FAQ di level knowledge, tetapi
  `classifyInbound` mendahulukan pola handoff (`custom-quote-or-availability`) —
  hasil akhirnya alur persetujuan handoff, sesuai spec (harga/ketersediaan perlu
  konfirmasi admin; tiket 05 yang mengatur Harga Indikatif).
- Jawaban FAQ tidak boleh memuat angka harga final; materi harga indikatif masuk
  lewat tiket 05.

## Sisa langkah (TDD: tes merah dulu → implementasi; typecheck berkala; file tes tunggal
sering; full suite sekali di akhir; lalu `/code-review`; commit ke `main`)

1. **Tiket 04** — `.scratch/whatsapp-customer-service-chatbot/issues/04-other-profile-services-faq.md`.
2. **Tiket 05** — `05-transparent-indicative-pricing.md`.
3. **Tiket 06** — `06-production-number-cutover.md` (butuh akses nomor produksi dari pemilik).

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
`7566989`. Integrasi tiket 03 selesai pada sesi `ebd9ef5`; tidak ada proses paralel lain
yang diketahui berjalan saat handoff ini ditulis.
