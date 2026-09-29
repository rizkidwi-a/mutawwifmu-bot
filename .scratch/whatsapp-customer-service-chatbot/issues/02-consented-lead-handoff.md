# 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan

**What to build:** Calon jemaah dapat memberikan informasi minimum untuk konsultasi pra-pemesanan, menyetujui penerusannya, dan membuat permintaan tersebut diterima tim customer service/penjualan.

**Blocked by:** 01: Sambungkan WhatsApp melalui nomor pengembangan

**Status:** ready-for-agent

- [ ] Bot mengumpulkan layanan/tujuan yang diminati, tanggal atau periode perjalanan, jumlah jemaah, dan kebutuhan utama; kisaran anggaran boleh diberikan secara opsional.
- [ ] Bot tidak meminta paspor atau informasi kesehatan untuk konsultasi awal.
- [ ] Sebelum meneruskan informasi, bot menjelaskan tujuan penerusan dan meminta persetujuan calon jemaah.
- [ ] Jika calon jemaah menolak persetujuan, informasi tidak diteruskan kepada admin.
- [ ] Jika disetujui, tim customer service/penjualan menerima ringkasan permintaan dan konteks percakapan melalui kanal admin yang telah disetujui.
- [ ] Kanal penerimaan admin dipastikan sebelum handoff dipakai di produksi; jangan mengasumsikan adanya CRM atau shared inbox tertentu.
- [ ] Permintaan berbicara dengan manusia, pertanyaan yang tidak didukung/tidak pasti, permintaan penawaran khusus atau pemeriksaan ketersediaan, pertanyaan dari agen/korporasi, serta kasus booking/pembayaran/perjalanan aktif/keadaan darurat dapat diteruskan kepada admin.
- [ ] Pesan konfirmasi menyatakan permintaan telah diteruskan tanpa menjanjikan waktu balasan admin.
- [ ] Permintaan yang berhasil diteruskan dapat dihitung sebagai metrik utama keberhasilan.
