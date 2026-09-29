# 06: Aktifkan nomor WhatsApp produksi

**What to build:** Setelah nomor produksi berada dalam kendali MUTAWWIFMU, calon jemaah dapat menghubungi bot melalui nomor tersebut dengan perilaku percakapan yang sama seperti pada nomor pengembangan.

**Blocked by:** 01: Sambungkan WhatsApp melalui nomor pengembangan; 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan; 03: Jawab FAQ Private Premium Umrah; 04: Jawab FAQ layanan lain dalam profil; 05: Tampilkan Harga Indikatif dengan peringatan; prasyarat eksternal: pengguna memiliki akses dan dapat menyelesaikan verifikasi nomor produksi

**Status:** ready-for-agent

- [ ] Nomor produksi dikonfigurasi melalui provider yang dipilih setelah akses dan verifikasi tersedia.
- [ ] Pesan masuk dan balasan keluar berhasil diuji end-to-end melalui nomor produksi.
- [ ] Penggantian nomor tidak mengharuskan perubahan pada perilaku percakapan bot.
- [ ] Informasi kontak publik yang dikendalikan MUTAWWIFMU diperbarui agar calon jemaah menggunakan nomor produksi yang aktif.
- [ ] Handoff ke admin dan jalur FAQ tetap berfungsi setelah cutover.
- [ ] Batasan migrasi riwayat percakapan dari nomor sebelumnya dijelaskan; jangan menjanjikan riwayat berpindah jika provider tidak mendukungnya.
