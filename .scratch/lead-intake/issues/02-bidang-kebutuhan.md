# 02: Bidang kebutuhan yang lengkap untuk konsultasi land arrangement

**What to build:** Permintaan Tindak Lanjut mengumpulkan bidang yang cukup bagi admin memulai konsultasi: layanan yang diminati (dari menu Layanan MUTAWWIFMU), tanggal/periode perjalanan, jumlah jemaah, kebutuhan detail (kebutuhan visa per jemaah, rute/asal keberangkatan, hotel mandiri vs lewat kami, catatan), serta kisaran anggaran opsional. Nilai disimpan apa adanya dari calon jemaah.

**Blocked by:** 01: Jadikan intake kebutuhan sebagai alur utama percakapan

**Status:** ready-for-agent

- [ ] Langkah pertama menampilkan menu layanan (mutawwif, visa & dokumen, hotel, transportasi, airport handling, ziarah/city tour, tasreh, fotografi, lainnya) sehingga calon jemaah tahu apa yang bisa diminta.
- [ ] Pertanyaan berurutan; bidang opsional (anggaran) dapat dilewati; jawaban bebas tetap diterima tanpa dipaksa ke pilihan.
- [ ] Kebutuhan detail dapat diisi dalam satu jawaban panjang (mis. "yang butuh visa cuma bapak & ibu mertua, terbang dari Jakarta") tanpa dipotong atau ditafsirkan ulang.
- [ ] Nilai bidang disimpan verbatim; tidak ada komponen generatif yang memparafrase data jemaah.
- [ ] Larangan meminta data paspor/kesehatan tetap berlaku; prompt tidak memintanya.
- [ ] Tipe `FollowUpRequest` diperbarui secara eksplisit (perubahan seam dicatat di Comments) dan seluruh pemakai lama ikut disesuaikan.

## Comments
