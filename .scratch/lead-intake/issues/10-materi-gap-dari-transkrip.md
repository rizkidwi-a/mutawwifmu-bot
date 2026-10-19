# 10: Putuskan penanganan topik yang sering ditanyakan tapi tidak ada di materi

**What to build:** (Keputusan terbuka — konfirmasi pemilik dulu.) Transkrip nyata memunculkan berulang topik yang tidak punya padanan di materi bisnis (`src/knowledge/businessFaq.ts`). Untuk tiap topik, pemilik memutuskan: (a) tambahkan sebagai materi/topik FAQ baru, atau (b) biarkan jatuh ke `handoff` — tetapi pastikan perilakunya konsisten dan pesannya tetap tercatat pada Ringkasan Kebutuhan. Topik yang diputuskan:

1. **Raudhah & Nusuk** — cara pesan, apakah perlu booking sendiri, batas usia anak untuk masuk Raudhah, tips apply via Nusuk (diajukan Cut Emelia & Vira Arman).
2. **Siskopatuh** — biaya pengurusan dan apakah wajib (Evi N, Vira Arman).
3. **Asuransi perjalanan** — tersedia atau tidak, dan ketentuannya (Evi N).
4. **Refund/pembatalan** — kebijakan jika batal berangkat (Cut Emelia).
5. **Vaksin** — timing (H-berapa) dan boleh tidaknya vaksin di luar negeri (Cut Emelia, Evi N).
6. **Kereta Haramain** — ketepatan waktu, durasi, seating, rute stasiun–bandara (Cut Emelia, Vira Arman).
7. **Metode pembayaran** — link payment, kartu kredit, skema DP/pelunasan/cicilan (Cut Emelia).
8. **Term & Condition DP** dan pelunasan (Evi N).
9. **Perlengkapan umroh, konsumsi, air zam-zam** — apa yang didapat jemaah (Cut Emelia).
10. **Konversi SAR→IDR** dan satuan harga (Cut Emelia).

**Blocked by:** none

**Status:** resolved

## Testing Decisions

- Setiap topik yang diputuskan menjadi materi: tambahkan entri di `src/knowledge/businessFaq.ts`, kasus uji di `tests/korpus/`, dan pastikan pertanyaan nyatanya (lihat referensi) terjawab, bukan jatuh ke handoff.
- Setiap topik yang diputuskan tetap handoff: pastikan pertanyaan nyatanya konsisten `handoff` (termasuk varian ejaan) dan muncul sebagai bagian kebutuhan pada ringkasan admin.
- Invarian lama tetap berlaku: tanpa klaim harga final, tanpa janji ketersediaan.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "Di luar materi — seharusnya handoff").
- Contoh pesan nyata per topik tercantum pada `tests/korpus/transkrip-nyata.json` (field `sumber` menunjukkan asal jemaah).
- Prioritas empiris dari frekuensi pertanyaan: Raudhah/Nusuk, siskopatuh, refund/pembatalan, dan metode pembayaran paling sering muncul.

### Keputusan pemilik (sesi 2026-10-10)

Pemilik memutuskan **kesepuluh topik tetap `handoff`** (opsi b) — tidak ada yang ditambahkan sebagai materi/FAQ baru, karena angka dan kebijakan pada transkrip belum menjadi materi resmi dan mudah berubah. Pemilik juga memilih **opsi (i)**: pertanyaan non-urgent yang datang sebagai pesan pertama tetap masuk alur intake lebih dahulu, dicatat sebagai bagian kebutuhan, lalu ikut pada Ringkasan Kebutuhan saat handoff — bukan handoff tanpa isi.

### Implementasi (sesi 2026-10-10)

- **Alur intake untuk pertanyaan dari awal** — `src/conversation/handleInbound.ts`: dari `idle`, `handoff` yang berupa pertanyaan non-urgent (bukan `URGENT_TRIGGERS`) tidak lagi langsung meminta persetujuan handoff; pesannya dicatat sebagai `notedQuestions` dan pengumpulan kebutuhan berlanjut. Pemicu non-pertanyaan (agen/korporasi, permintaan penawaran, keadaan darurat, perjalanan aktif, permintaan manusia) tetap handoff langsung.
- **Konsistensi klasifikasi** — `src/conversation/classifyInbound.ts`: `ketentuan(nya)` masuk `UNSUPPORTED_DETAIL`; pola asuransi menangkap ketentuan/cakupan (`ketentuan`, `coverage`, `include`, `manfaat`) dan bukan hanya ketersediaan; `BENTUK_TANYA_SEHARI_HARI` menangkap bentuk tanya tanpa tanda tanya (`"... dapat ga"`, `"... bisa"`, `"... include ga"`) dan dipakai bersama `isPertanyaan` di `handleInbound` sebagai satu sumber pola.
- **Korpus** — `tests/korpus/topik-gap.json` (16 kasus varian topik gap, semuanya berlabel `handoff`, termasuk yang tanpa tanda tanya). Korpusnya ikut ditegakkan `npm test` melalui `tests/conversation/topikGapHandoff.test.ts`, bukan hanya `scripts/probe-cakupan.ts`.
- **Tes** — `tests/conversation/topikGapHandoff.test.ts`: 15 kalimat nyata dari `tests/korpus/transkrip-nyata.json` (satu per topik/pertanyaan) plus seluruh varian `topik-gap.json`, masing-masing diverifikasi tercatat pada `notedQuestions` dan sampai ke admin lewat `formatAdminHandoff`; ditambah penjaga bahwa pernyataan berakhiran `bisa/dapat` yang negatif atau sudah berjalan ("ga bisa", "sudah bisa") bukan pertanyaan, dan bahwa pernyataan agen/penawaran tetap handoff langsung. Tes lama yang mengasumsikan handoff langsung dari pesan pertama diperbarui (`handOffToAdmin`, `faqAnswer`, `indicativePricing`, `otherProfileServicesFaq`), dengan helper bersama `lengkapiPermintaanLaluSetujui` di `tests/conversation/pembantuPercakapan.ts`.

Verifikasi:

- `npm test` hijau: 289 lulus, 0 gagal; `npm run typecheck` bersih.
- `node scripts/probe-cakupan.ts`: 118 kasus, rute tepat **109/118 (92%)**; `transkrip-nyata.json` 54/54; `topik-gap.json` 16/16.
- Invarian lama tetap: tanpa klaim harga final, tanpa janji ketersediaan; aturan "Harga Indikatif hanya dijawab untuk pesan bertanda pertanyaan" diperjelas di `README.md` agar mencakup bentuk tanya sehari-hari tanpa tanda tanya yang diakui sebagai pertanyaan.
