# Handoff Sesi — Lanjutkan Integrasi Tiket 03

**Untuk sesi baru:** baca file ini lebih dulu, lalu kerjakan sisa langkah di bawah.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru — jangan memaksakan sampai kehabisan konteks.

## Status repo (branch `main`, working tree bersih)

| Commit | Isi |
| --- | --- |
| `a72d4cb` | Tiket 02 selesai (`resolved`): alur Permintaan Tindak Lanjut + gate persetujuan + handoff + port `AdminChannel`/`ConversationStore`/`Metrics` + `GET /metrics` |
| `7566989` | Modul tiket 03 dari sesi paralel (knowledge FAQ + `classifyInbound` + `language.ts` + tesnya) |
| `27ff422` | Fix 3 celah `classifyInbound` (sapaan basa-basi, "hubungkan saya dengan admin", "memesan") |

Terakhir diverifikasi: **108 tes hijau**, `npm run typecheck` bersih.

## Konteks singkat

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam yang disepakati: `src/conversation/handleInbound.ts` (pesan + konteks percakapan →
  balasan + tindakan terlihat). State multi-giliran diturunkan dari riwayat percakapan —
  **seam tetap murni, jangan ubah bentuk `BotTurn`**.
- Tindakan yang ada di `src/conversation/types.ts`: `record-follow-up-request`,
  `hand-off-to-admin` (payload `reason: HandOffReason`, `request`, `history`).
- Modul siap pakai untuk tiket 03 (commit `7566989`):
  - `src/knowledge/privatePremiumUmrahFaq.ts` — `matchFaqTopic(text): UmrahFaqTopic | null`,
    `faqAnswer(topic, language: Language): string`; 11 topik (land-arrangement, mutawwif,
    visa-documents, hotel-accommodation, transport-fleet, airport-handling, city-tour,
    city-tour-makkah/madinah/thaif/alula).
  - `src/conversation/classifyInbound.ts` — `classifyInbound(text): InboundRouting`
    (`faq`/`handoff`/`opener`); `HandoffTrigger` sudah selaras `HandOffReason`.
  - `src/conversation/language.ts` — `detectLanguage` + `Language`.

## Sisa langkah (TDD: tes merah dulu → implementasi; typecheck berkala; file tes tunggal
sering; full suite sekali di akhir; lalu `/code-review`; commit ke `main`)

### Slice A — jawaban FAQ pada seam (BELUM ada tes/kode)

Buat `tests/conversation/faqAnswer.test.ts` memakai `Percakapan`/`teksBalasan` dari
`tests/conversation/pembantuPercakapan.ts`:

1. Tabel pertanyaan → kata kunci jawaban (lihat "Fakta terverifikasi"): tiap baris —
   balasan memuat kata kunci topik, `turn.actions` memuat `record-faq-answer` berisi
   `topic`, dan TANPA `hand-off-to-admin`.
2. Pertanyaan EN ("What is land arrangement?") → jawaban EN.
3. "Berapa harga hotel di Mekkah?" → BUKAN jawaban harga; balasan mengalirkan ke
   permintaan persetujuan handoff dan tidak memuat angka harga (assert `doesNotMatch /Rp|USD|\d/` hati-hati — balasan persetujuan tidak memuat angka).
4. Jawaban FAQ tidak menjanjikan transaksi (`doesNotMatch /(pesan sekarang|bayar sekarang|booking sekarang)/i`).

Implementasi: tambah varian tindakan `{ readonly kind: "record-faq-answer"; readonly topic: string }`
di `src/conversation/types.ts` (komentarnya mengizinkan varian baru saat tiket
membutuhkan), lalu di `handleInbound` balas `faqAnswer(routing.topic, language)` +
tindakan tersebut.

### Slice B — integrasikan `classifyInbound` ke `handleInbound`

- Hapus detektor privat `detectUrgentReason`/`detectHandOffReason` serta regex
  `HUMAN_REQUEST`/`ACTIVE_TRIP`/`EMERGENCY`/`BOOKING_OR_PAYMENT`/`AGENCY_OR_CORPORATE`/
  `CUSTOM_QUOTE_OR_AVAILABILITY`/`STRONG_QUESTION`/`PLEASANTRY`/`GREETING_WORDS` —
  ganti dengan `classifyInbound` (satu sumber klasifikasi, sesuai komentar tiket 02).
- Urutan `nextState` yang teruji (JANGAN diubah — dilindungi tes tiket 02):
  1. Resolusi persetujuan bila state menunggu (`ya`/`tidak`) → `idle`;
  2. Pemicu mendesak `{emergency, active-trip, human-request}` menyela apa pun
     (termasuk saat pengumpulan) → `awaiting-handoff-consent`;
  3. Bila `collecting` → isi slot berikutnya (klasifikasi diabaikan agar jawaban
     bidang seperti "Butuh kamar keluarga" tidak salah jadi pemicu/FAQ);
  4. Bila masih menunggu persetujuan → tetap (balasan meminta konfirmasi ulang);
  5. Routing `handoff` (non-mendesak) → `awaiting-handoff-consent` (`reason` = trigger);
  6. `FOLLOW_UP_START` (tetap di `handleInbound` — intent konsultasi) → `collecting`;
  7. Di `step` untuk `idle`: routing `faq` → jawab FAQ; `opener`/lainnya → sapaan awal.
- Wajib: seluruh tes tiket 02 (`tests/conversation/followUpRequest.test.ts`,
  `handOffToAdmin.test.ts`, `handleInbound.test.ts`) tetap hijau **tanpa diubah**.

### Slice C — penyatuan deteksi bahasa

Pindahkan logika `shouldReplyInIndonesian`/`detectTurnLanguage` dari `handleInbound`
(marker lebar + fallback bahasa percakapan dari riwayat) ke `src/conversation/language.ts`
sebagai `resolveReplyLanguage(history, text): Language`; `detectLanguage` tetap diekspor
(knowledge module memakainya). Hapus marker inline di `handleInbound`. Tes tiket 01
melindungi perilaku bahasa.

### Slice D — metrik FAQ + wiring server

- `src/metrics.ts`: tambah `faqAnswered` ke `MetricsSnapshot` + `recordFaqAnswer()`
  (metrik pendamping tiket 03: "FAQ terjawab tanpa handoff").
- `src/server.ts` (`runActions`): tangani `record-faq-answer` → `metrics.recordFaqAnswer()`.
- `tests/transport/handOffDelivery.test.ts`: perbarui semua assertion snapshot
  (tambah `faqAnswered: 0`) + satu tes baru: pertanyaan FAQ via webhook →
  `faqAnswered: 1` dan TIDAK ada handoff ke kanal admin.

### Slice E — dokumentasi, tiket, review, commit

- README: bagian FAQ (jawab dari materi; harga/ketersediaan & hal tak didukung → alur
  handoff dengan persetujuan).
- Tiket 03 (`.scratch/whatsapp-customer-service-chatbot/issues/03-private-premium-umrah-faq.md`):
  centang 7 butir checklist, tulis komentar implementasi, `Status: resolved`
  (label triase kanonis; jangan pakai `done`/`completed`).
- Jalankan skill `code-review` (dua sumbu: Standards + Spec), perbaiki temuan, lalu commit.

## Fakta terverifikasi (jangan probe ulang)

Hasil probe `matchFaqTopic` pada commit `27ff422`:

- "Apa itu land arrangement?" → `land-arrangement`
- "Ceritakan tentang mutawwif Anda" → `mutawwif`
- "Apakah bisa urus visa umrah?" → `visa-documents`
- "Kamar hotel tipe apa saja?" → `hotel-accommodation`
- "Apa saja jenis armada transportasinya?" → `transport-fleet`
- "Bagaimana layanan airport handling?" → `airport-handling`
- "Apakah tersedia city tour?" → `city-tour`
- "Apa itu city tour di Mekkah?" → `city-tour-makkah`
- "What is land arrangement?" → `land-arrangement`
- "Berapa harga hotel di Mekkah?" → cocok `hotel-accommodation` **pada level knowledge**,
  tetapi `classifyInbound` mendahulukan pola handoff (harga → `custom-quote-or-availability`),
  jadi hasil akhirnya handoff. **Jangan panggil `matchFaqTopic` langsung tanpa cek pola handoff.**
- "bisakah saya memesan paket umrah bulan depan?" → `null` di knowledge; di klasifier → `booking-or-payment`.

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

Sesi paralel yang dulu menulis tiket 03 sudah mati dan kerjanya diamanatkan di
commit `7566989`; tidak ada proses lain yang berjalan saat handoff ini ditulis —
kondisi aman untuk melanjutkan.

## Setelah tiket 03 selesai

Tiket berikutnya: `04-other-profile-services-faq.md`, `05-transparent-indicative-pricing.md`,
lalu `06-production-number-cutover.md` (butuh akses nomor produksi dari pemilik).
