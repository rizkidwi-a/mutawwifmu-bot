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

**Status:** needs-triage

## Testing Decisions

- Setiap topik yang diputuskan menjadi materi: tambahkan entri di `src/knowledge/businessFaq.ts`, kasus uji di `tests/korpus/`, dan pastikan pertanyaan nyatanya (lihat referensi) terjawab, bukan jatuh ke handoff.
- Setiap topik yang diputuskan tetap handoff: pastikan pertanyaan nyatanya konsisten `handoff` (termasuk varian ejaan) dan muncul sebagai bagian kebutuhan pada ringkasan admin.
- Invarian lama tetap berlaku: tanpa klaim harga final, tanpa janji ketersediaan.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "Di luar materi — seharusnya handoff").
- Contoh pesan nyata per topik tercantum pada `tests/korpus/transkrip-nyata.json` (field `sumber` menunjukkan asal jemaah).
- Prioritas empiris dari frekuensi pertanyaan: Raudhah/Nusuk, siskopatuh, refund/pembatalan, dan metode pembayaran paling sering muncul.
