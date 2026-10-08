# 03: Ringkasan kebutuhan yang rapi untuk admin

**What to build:** Sebelum dikirim, ringkasan kebutuhan ditampilkan kepada calon jemaah per bidang untuk diperiksa, lalu setelah persetujuan dikirim ke nomor admin dalam format yang mudah dipindai: identitas pengirim, bidang kebutuhan, sebutan lampiran bila ada, dan konteks percakapan. Perbaiki kebocoran teks "requestSummary" pada pesan ke calon jemaah.

**Blocked by:** 02: Bidang kebutuhan yang lengkap untuk konsultasi land arrangement

**Status:** resolved

- [x] Calon Jemaah melihat ringkasan per bidang sebelum dimintai persetujuan; teksnya bebas placeholder internal.
- [x] Pesan admin memuat seluruh bidang kebutuhan, nomor calon jemaah, dan konteks percakapan (mekanisme `AdminHandoff` yang berlaku).
- [x] Pesan non-teks yang diterima selama intake disebut sebagai lampiran pada ringkasan (isinya tidak ditafsirkan bot).
- [x] Istilah pada ringkasan konsisten dengan `CONTEXT.md` (Permintaan Tindak Lanjut, Ringkasan Kebutuhan).
- [x] Alur persetujuan yang ada (setuju/tidak/tanya ulang) tetap berlaku tanpa perubahan perilaku.

## Comments

- Kebocoran placeholder: teks persetujuan ID berbunyi "Berikut requestSummary Permintaan Tindak Lanjut Anda" — nama helper internal bocor ke calon jemaah. Kini "Berikut Ringkasan Kebutuhan dari Permintaan Tindak Lanjut Anda:"; helper `requestSummary` diganti namanya menjadi `ringkasanKebutuhan` agar kebocoran serupa tidak terulang. Tes `tests/conversation/ringkasanUntukAdmin.test.ts` mengunci ringkasan per bidang bebas placeholder (`requestSummary`, `{{`, `TODO`, dsb.).
- Perubahan seam: seam `handleInbound(message, context)` **tidak berubah**; yang berubah bentuk tipe yang dibawanya. `ConversationTurn` bertambah penanda `attachment?: true` untuk giliran penerimaan lampiran, dan `FollowUpRequest` bertambah `attachmentCount`. Pemakai yang disesuaikan: `src/server.ts` dan `tests/conversation/pembantuPercakapan.ts` (merekam giliran lewat `turnForInbound`), literal `FollowUpRequest` pada `tests/adminChannel.test.ts`, `tests/transport/handOffDelivery.test.ts`, `tests/conversation/followUpRequest.test.ts`, dan `tests/conversation/bidangKebutuhan.test.ts`.
- Pesan non-teks (lampiran): `InboundMessage.text === null` diperlakukan sebagai lampiran (gambar/dokumen, mis. bukti booking/bukti transfer). `turnForInbound` merekamnya sebagai giliran tersendiri ("Lampiran: pesan non-teks") di riwayat, transkrip, dan konteks percakapan; replay state tidak pernah mengonsumsinya sebagai jawaban bidang. Balasan mengakui penerimaannya dan menyatakan isinya tidak ditafsirkan, lalu mengajukan langkah alur yang sama (prompt bidang berikutnya, atau Ringkasan Kebutuhan + persetujuan bila sedang menunggu persetujuan). Lampiran pertama tetap mengarahkan ke pengumpulan seperti chat masuk lain (ADR-0009).
- Ringkasan menyebut lampiran **bila ada** saja: `- Lampiran: N pesan non-teks diterima (isinya tidak ditafsirkan)` di ringkasan calon jemaah maupun Ringkasan Kebutuhan untuk admin. Sebutan sengaja generik (jumlah, bukan nama/isi berkas) karena isinya tidak boleh ditafsirkan bot; jenis berkas dari metadata provider dapat menyusul bila admin membutuhkannya.
- Penghitungan lampiran mencakup semua pesan non-teks yang tercatat pada Permintaan Tindak Lanjut — termasuk yang tiba sebelum pengumpulan dimulai dan saat menunggu persetujuan (ringkasan diperbarui dan ditampilkan lagi sebelum persetujuan diminta). Sedikit lebih luas daripada frasa "selama intake", tetapi tidak ada lampiran yang hilang dari ringkasan.
- Istilah admin: judul ringkasan pada pesan admin berganti dari "Ringkasan Permintaan Tindak Lanjut:" menjadi "Ringkasan Kebutuhan:" sesuai `CONTEXT.md`; isi pesan tetap identitas pengirim (nomor calon jemaah), bidang kebutuhan, sebutan lampiran bila ada, dan konteks percakapan melalui mekanisme `AdminHandoff` (ADR-0006) yang tidak berubah.
- Alur persetujuan (setuju/tidak/tanya ulang) tidak disentuh; seluruh tes regresi lama tetap lolos (222 tes). Satu tes lama yang berubah perilakunya secara sengaja: "pesan non-teks tidak menghasilkan balasan" menjadi "pesan non-teks diakui penerimaannya sebagai lampiran" (spec ruang lingkup 6: "diakui penerimaannya"; ruang lingkup 1: setiap chat masuk dibalas cepat).
- Catatan review (Standards, judgement call): kalimat baris lampiran duplikat antara `ringkasanKebutuhan` (`handleInbound.ts`) dan `requestLines` (`adminChannel.ts`), mengikuti pola duplikasi label bidang yang sudah ada; ekstraksi renderer bersama dapat dikerjakan terpisah.
- Tes baru: `tests/conversation/ringkasanUntukAdmin.test.ts` (ringkasan per bidang, bebas placeholder, istilah CONTEXT.md, lampiran diakui/disebut/tidak mengisi bidang/hanya bila ada, pembaruan ringkasan saat menunggu persetujuan, varian EN) dan tiga tes baru pada `tests/adminChannel.test.ts` (kelengkapan pesan admin, istilah Ringkasan Kebutuhan, lampiran hanya bila ada). `README.md` diperbarui untuk perilaku ringkasan dan lampiran.
