# 03: Ringkasan kebutuhan yang rapi untuk admin

**What to build:** Sebelum dikirim, ringkasan kebutuhan ditampilkan kepada calon jemaah per bidang untuk diperiksa, lalu setelah persetujuan dikirim ke nomor admin dalam format yang mudah dipindai: identitas pengirim, bidang kebutuhan, sebutan lampiran bila ada, dan konteks percakapan. Perbaiki kebocoran teks "requestSummary" pada pesan ke calon jemaah.

**Blocked by:** 02: Bidang kebutuhan yang lengkap untuk konsultasi land arrangement

**Status:** ready-for-agent

- [ ] Calon Jemaah melihat ringkasan per bidang sebelum dimintai persetujuan; teksnya bebas placeholder internal.
- [ ] Pesan admin memuat seluruh bidang kebutuhan, nomor calon jemaah, dan konteks percakapan (mekanisme `AdminHandoff` yang berlaku).
- [ ] Pesan non-teks yang diterima selama intake disebut sebagai lampiran pada ringkasan (isinya tidak ditafsirkan bot).
- [ ] Istilah pada ringkasan konsisten dengan `CONTEXT.md` (Permintaan Tindak Lanjut, Ringkasan Kebutuhan).
- [ ] Alur persetujuan yang ada (setuju/tidak/tanya ulang) tetap berlaku tanpa perubahan perilaku.

## Comments
