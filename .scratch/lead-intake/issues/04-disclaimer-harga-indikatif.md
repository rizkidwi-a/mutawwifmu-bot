# 04: Penegasan bahwa Harga Indikatif dapat berubah setelah diperiksa admin

**What to build:** Semua jawaban Harga Indikatif menyebutkan secara eksplisit bahwa angka bersifat indikatif dan dapat berubah setelah diperiksa admin, sesuai keputusan pemilik (ADR-0009). Harga Indikatif menjadi satu-satunya jawaban faktual yang tersisa di runtime.

**Blocked by:** 01: Jadikan intake kebutuhan sebagai alur utama percakapan

**Status:** resolved

- [x] Setiap jawaban harga (ID dan EN) memuat penegasan bahwa angka dapat berubah mengikuti pemeriksaan admin.
- [x] Penegasan yang sudah ada ("bukan penawaran final", "mohon konfirmasi kepada tim kami") tetap dipertahankan.
- [x] Harga hotel dengan satuan yang belum terverifikasi tetap tidak menyebut angka sebagai harga per orang/per kamar.
- [x] Permintaan penawaran/konfirmasi harga atau ketersediaan tetap diteruskan ke admin, bukan dijawab sebagai harga indikatif.
- [x] Tes groundedness angka harga tetap hijau.

## Comments

- Penegasan admin ditambahkan ke ketujuh jawaban topik Harga Indikatif di `src/knowledge/businessFaq.ts`, ID dan EN, dengan pola seragam: "Angka dapat berubah setelah diperiksa admin" / "Figures may change after being reviewed by our admin" (airport handling yang sudah punya catatan "dapat berubah sewaktu-waktu" dilengkapi "termasuk setelah diperiksa admin" agar fakta materi periode 2025–2026 tidak hilang). Penegasan lama ("bukan penawaran final", arahan konfirmasi "kepada tim kami"/"our team") dipertahankan apa adanya; disclaimer tidak memuat angka sehingga groundedness angka (`pengamanAngka.ts`) tidak terpengaruh.
- Seam `handleInbound` tidak berubah; perubahan murni pada teks jawaban template. Tes baru: satu tes pada `tests/knowledge/businessFaq.test.ts` (loop tujuh topik × ID/EN memastikan penegasan admin + penegasan lama tetap ada), serta asersi penegasan pada `tests/conversation/indicativePricing.test.ts` (loop pertanyaan harga ID dan tes Bahasa Inggris).
- Checklist terkait dijaga oleh tes yang sudah ada tanpa perubahan: tes hotel satuan belum terverifikasi, tes penawaran/konfirmasi harga-ketersediaan ke alur admin, dan tes groundedness angka (`tests/knowledge/geminiPemaham.test.ts`, `tests/knowledge/businessFaq.test.ts`). Suite penuh 210 tes hijau.
