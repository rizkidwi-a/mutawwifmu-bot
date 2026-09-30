# 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan

**What to build:** Calon jemaah dapat memberikan informasi minimum untuk konsultasi pra-pemesanan, menyetujui penerusannya, dan membuat permintaan tersebut diterima tim customer service/penjualan.

**Blocked by:** None (unblocked — 01 resolved, transport aktif)

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

## Comments

### Unblock tiket 02 (agent)

01 berstatus `resolved` — transport WhatsApp aktif (Fonnte, ADR-0003) dan balasan awal terbukti end-to-end — sehingga tiket ini tidak lagi terblokir dan siap diimplementasikan.

Keputusan yang jangan diasumsikan saat implementasi (lihat spec):

1. **Kanal admin penerima handoff** — spec melarang mengasumsikan CRM atau shared inbox tertentu. Usulan yang aman: handoff berada di balik port (mis. `AdminChannel`) dengan impl sementara yang dikonfigurasi; kanal final tetap keputusan pemilik dan dicatat ADR. Checklist "kanal penerimaan admin dipastikan" adalah gate pra-produksi (lihat juga tiket 06).
2. **Penyimpanan percakapan dan Permintaan Tindak Lanjut** — `ConversationContext` pada seam saat ini selalu kosong; tiket ini butuh state multi-turn dan hitungan metrik. Minimal: penyimpanan in-memory di balik port, tanpa mengunci keputusan retensi/persistent store.

Seam yang disepakati tidak berubah: `src/conversation/handleInbound.ts` (pesan + konteks → balasan + tindakan terlihat). Varian tindakan `record-follow-up-request` dan `hand-off-to-admin` sudah tersedia di `src/conversation/types.ts`. Tes perilaku wajib pada seam ini; tes transport tidak menggantikannya.
