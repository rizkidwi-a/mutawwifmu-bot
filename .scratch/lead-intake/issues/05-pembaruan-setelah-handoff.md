# 05: Pembaruan kebutuhan setelah ringkasan terkirim

**What to build:** (Keputusan terbuka — konfirmasi pemilik dulu.) Pada percakapan nyata kebutuhan berubah berkali-kali setelah ringkasan pertama (tambah airport handling, hapus transport, revisi hotel). Usulan: setelah ringkasan terkirim, calon jemaah masih dapat menambah/mengubah kebutuhan; bot mengumpulkan perubahannya, menampilkan ringkasan yang diperbarui, dan mengirim ulang ke admin dengan penanda "PEMBARUAN" agar admin tahu ini revisi, bukan prospek baru.

**Blocked by:** 03: Ringkasan kebutuhan yang rapi untuk admin

**Status:** ready-for-agent

- [x] Pemilik memutuskan: (a) terima pembaruan dengan ringkasan ulang berpenanda "PEMBARUAN" — dipilih pada sesi 2026-10-08.
- [ ] Perilaku sesuai keputusan diimplementasikan dengan persetujuan calon jemaah untuk setiap pengiriman ulang.
- [ ] Riwayat ringkasan yang sudah terkirim tidak tertimpa diam-diam; perubahan terlihat sebagai revisi.

## Comments

### Keputusan pemilik (2026-10-08)

Opsi (a) dipilih: setelah ringkasan terkirim, calon jemaah masih dapat menambah/mengubah kebutuhan; bot mengumpulkan perubahannya, menampilkan ringkasan yang diperbarui, dan mengirim ulang ke admin dengan penanda "PEMBARUAN". Tiket siap dikerjakan; implementasi dimulai di sesi berikutnya.
