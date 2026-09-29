# 01: Sambungkan WhatsApp melalui nomor pengembangan

**What to build:** Calon jemaah dapat mengirim pesan ke nomor WhatsApp pengembangan dan menerima balasan bot. Pengirim dikonfigurasi agar nomor produksi kelak dapat diganti tanpa mengubah perilaku percakapan.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Provider integrasi dipilih dan nomor pengembangan `+62 895 0700 3830` dapat menerima serta mengirim pesan setelah verifikasi yang diperlukan.
- [ ] Pesan masuk menghasilkan balasan awal yang aman melalui WhatsApp secara end-to-end.
- [ ] Proses bot dapat berjalan setiap saat; ketersediaan balasan otomatis tidak bergantung pada jam kerja admin.
- [ ] Nomor pengirim dan identitas provider dapat diganti melalui konfigurasi, bukan tertanam pada perilaku percakapan.
- [ ] Jalur penggantian nomor ke nomor produksi dijelaskan, termasuk langkah verifikasi provider yang diperlukan.
- [ ] Pengujian transport membuktikan pesan masuk dan balasan keluar melalui kanal provider tanpa menggantikan tes perilaku pada seam percakapan yang disepakati.
