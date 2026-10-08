# 05: Pembaruan kebutuhan setelah ringkasan terkirim

**What to build:** (Keputusan terbuka — konfirmasi pemilik dulu.) Pada percakapan nyata kebutuhan berubah berkali-kali setelah ringkasan pertama (tambah airport handling, hapus transport, revisi hotel). Usulan: setelah ringkasan terkirim, calon jemaah masih dapat menambah/mengubah kebutuhan; bot mengumpulkan perubahannya, menampilkan ringkasan yang diperbarui, dan mengirim ulang ke admin dengan penanda "PEMBARUAN" agar admin tahu ini revisi, bukan prospek baru.

**Blocked by:** 03: Ringkasan kebutuhan yang rapi untuk admin

**Status:** resolved

- [x] Pemilik memutuskan: (a) terima pembaruan dengan ringkasan ulang berpenanda "PEMBARUAN" — dipilih pada sesi 2026-10-08.
- [x] Perilaku sesuai keputusan diimplementasikan dengan persetujuan calon jemaah untuk setiap pengiriman ulang.
- [x] Riwayat ringkasan yang sudah terkirim tidak tertimpa diam-diam; perubahan terlihat sebagai revisi.

## Comments

### Keputusan pemilik (2026-10-08)

Opsi (a) dipilih: setelah ringkasan terkirim, calon jemaah masih dapat menambah/mengubah kebutuhan; bot mengumpulkan perubahannya, menampilkan ringkasan yang diperbarui, dan mengirim ulang ke admin dengan penanda "PEMBARUAN". Tiket siap dikerjakan; implementasi dimulai di sesi berikutnya.

### Implementasi (sesi 2026-10-08)

- Perubahan seam: seam `handleInbound(message, context)` **tidak berubah**; yang berubah bentuk tipe yang dibawanya. `FollowUpRequest` bertambah `changeNotes` (catatan perubahan apa adanya setelah ringkasan terkirim; kosong pada pengiriman pertama), dan tindakan `hand-off-to-admin` / `AdminHandoff` bertambah penanda `revision?: true` untuk pengiriman ulang. Pemakai yang disesuaikan: `src/server.ts` (meneruskan `revision` ke `AdminChannel`) dan literal `FollowUpRequest` pada `tests/adminChannel.test.ts`, `tests/conversation/bidangKebutuhan.test.ts`, `tests/conversation/followUpRequest.test.ts`, dan `tests/transport/handOffDelivery.test.ts`.
- Alur pembaruan: setelah persetujuan pengiriman pertama, state alur masuk mode pembaruan (`sent`). Pesan berikutnya dikumpulkan apa adanya sebagai perubahan kebutuhan (`changeNotes`) — pertanyaan non-harga tetap dicatat sebagai `notedQuestions`, pertanyaan Harga Indikatif dijawab tanpa mengubah kebutuhan, dan pesan non-teks menambah lampiran — lalu Ringkasan Kebutuhan yang diperbarui ditampilkan untuk dimintai persetujuan pengiriman ulang. Nilai verbatim tidak diparafrase; tidak ada komponen generatif.
- Persetujuan per pengiriman ulang: pengiriman ulang hanya terjadi dari state menunggu persetujuan pengiriman ulang, dengan teks persetujuan yang sama (setuju/tidak/tanya ulang). Konfirmasi pengiriman ulang menyebut "PEMBARUAN" dan tidak menjanjikan waktu balasan admin. Penolakan tidak mengirim apa pun dan tidak menghapus catatan perubahan.
- Penanda "PEMBARUAN" pada pesan admin (`adminChannel.ts`): baris "PEMBARUAN — revisi Ringkasan Kebutuhan yang sudah dikirim sebelumnya (bukan prospek baru)" di awal pesan hanya untuk pengiriman ulang; pesan pertama tetap tanpa penanda. Catatan perubahan muncul sebagai baris `- Perubahan: ...` pada Ringkasan Kebutuhan untuk admin.
- Riwayat tidak tertimpa diam-diam: `changeNotes` tidak pernah dikosongkan — pengiriman ulang mana pun membawa seluruh catatan yang pernah disampaikan, dan nilai bidang hasil pengumpulan pertama tetap utuh apa adanya. Setiap pengiriman (pertama maupun ulang) memunculkan `record-follow-up-request` dengan snapshot-nya sendiri, sehingga riwayat ringkasan yang terkirim terlihat pada tindakan seam.
- Pemulihan setelah handoff (lingkup yang dicadangkan tiket 01): state yang terputus oleh pemicu handoff (termasuk darurat/perjalanan aktif/permintaan manusia) dilanjutkan kembali setelah handoff selesai — mode pembaruan tidak hilang dan pesan berikutnya tetap diproses sebagai revisi. Draft yang sedang berjalan tetap tidak ikut dibawa ke pesan handoff (keputusan tiket 01 berlaku).
- Keputusan sadar di luar opsi (a): pertanyaan Harga Indikatif setelah ringkasan terkirim dijawab tanpa memicu pengiriman ulang (tidak mengubah kebutuhan); pemicu handoff non-darurat setelah ringkasan terkirim dicatat sebagai perubahan kebutuhan dan diteruskan lewat pengiriman ulang (admin yang menangani booking/pembayaran dsb.), mengikuti ADR-0009 bahwa pertanyaan lain dicatat sebagai bagian kebutuhan — hanya `emergency`/`active-trip`/`human-request` yang menyela ke handoff percakapan.
- Tes baru: `tests/conversation/pembaruanSetelahHandoff.test.ts` (13 kasus) — ringkasan yang diperbarui beserta catatan perubahan, nilai bidang dipertahankan verbatim, pengiriman ulang hanya dengan persetujuan dan berpenanda revisi, persetujuan baru per pengiriman, akumulasi catatan lintas putaran, penolakan tanpa kehilangan catatan, pertanyaan non-harga/Harga Indikatif, lampiran setelah terkirim, pemulihan setelah handoff darurat, bebas placeholder, varian EN) serta empat tes baru pada `tests/adminChannel.test.ts` (penanda PEMBARUAN, tanpa penanda pada pesan pertama, catatan perubahan pada ringkasan admin, tanpa baris perubahan bila kosong). `README.md` dan `CONTEXT.md` (istilah Pembaruan Kebutuhan) diperbarui.
