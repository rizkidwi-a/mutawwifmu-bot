# 03: Istilah domain dan ADR penyela pengumpulan

**What to build:** Dokumen domain untuk dua perilaku baru: ADR di `docs/adr/`
untuk keputusan (a) pertanyaan menyela dikirim ke Bagian Pertanyaan dan
dikonfirmasi admin, bukan dijawab/diisi ke bidang; (b) perbaikan bidang
terarah dengan ulang jawaban lalu kembali ke state sebelumnya. Tambahkan
istilah baru ke glossary `CONTEXT.md` bila diperlukan (mis. "Pertanyaan
Menyela", "Perbaikan Bidang") dengan format yang ada (istilah + deskripsi +
_Avoid_). Perbarui bagian perilaku percakapan pada `README.md` bila ada
perilaku yang perlu disebut di sana.

**Blocked by:** 01: Pertanyaan menyela dengan kata kunci "ingin bertanya", 02: Hapus bagian spesifik dan ulang jawabannya

**Status:** resolved

- [x] ADR memuat konteks, keputusan, dan alternatif yang ditolak sesuai pola
      ADR yang ada; konflik dengan ADR lama dinyatakan eksplisit bila ada.
- [x] `CONTEXT.md` memakai kosakata glossary yang konsisten.
- [x] Regresi lintas dialog nyata (`data/`) tetap hijau dengan perilaku baru
      aktif.

## Comments

### Implementasi (sesi 2026-10-10)

ADR-0012 (`docs/adr/0012-penyela-pengumpulan.md`) mencakup kedua keputusan
sekaligus beserta alternatif yang ditolak. Glossary `CONTEXT.md` bertambah
istilah **Pertanyaan Menyela**, **Bagian Pertanyaan**, dan **Perbaikan Bidang**;
paragraf perilaku `README.md` diperbarui. Regresi dialog nyata
(`regresiDialogNyata.test.ts`, replay 4 transkrip `data/`) hijau.
