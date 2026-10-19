# 01: Jadikan intake kebutuhan sebagai alur utama percakapan

**What to build:** Setiap chat masuk dari calon jemaah dibalas cepat, lalu diarahkan ke pengumpulan Permintaan Tindak Lanjut. Jawaban FAQ non-harga dinonaktifkan dari jalur runtime; pertanyaan non-harga dicatat sebagai bagian kebutuhan dan diteruskan ke admin. Harga Indikatif tetap dapat dijawab. Pemicu darurat/perjalanan aktif/permintaan manusia tetap menyela langsung ke handoff.

**Blocked by:** -

**Status:** resolved

- [x] Percakapan prospek selalu berujung pada alur intake tanpa harus cocok pola `FOLLOW_UP_START` lebih dulu.
- [x] Pertanyaan non-harga tidak lagi dijawab dari `businessFaq.ts`; pesannya tidak hilang — tetap tercatat dan terbawa ke ringkasan admin.
- [x] Pertanyaan Harga Indikatif tetap terjawab (tiket 04 menangani disclaimernya).
- [x] Pemicu `emergency`, `active-trip`, `human-request` tetap menghasilkan handoff langsung tanpa menunggu intake selesai.
- [x] ADR-0009 tercatat di `docs/adr/` dan spesifikasi lama diberi tautan ke `.scratch/lead-intake/spec.md`.
- [x] Tes lama yang mengasumsikan jawaban FAQ non-harga disesuaikan secara sadar dan alasannya dicatat di Comments.

## Comments

- Intake sebagai jalur default: pola `FOLLOW_UP_START` dihapus dari `handleInbound.ts`. Pesan yang tidak memicu handoff apa pun (sapaan, pertanyaan, pernyataan) langsung masuk pengumpulan: balasan cepat (respons awal / catatan pertanyaan / jawaban Harga Indikatif) digabung dengan prompt bidang pertama. Konsekuensinya tes `handleInbound.test.ts`, `followUpRequest.test.ts`, dan `handOffToAdmin.test.ts` tetap lolos tanpa perubahan perilaku karena prompt bidang pertama sudah muncul pada balasan pertama.
- Pertanyaan non-harga dicatat sebagai bagian kebutuhan: `FollowUpRequest` bertambah bidang `notedQuestions` (isi verbatim). Pertanyaan muncul pada Ringkasan Kebutuhan calon jemaah (baris "Pertanyaan yang dicatat") dan pada pesan admin (`adminChannel.ts`). Ini perubahan tipe kecil di luar redesain bidang milik tiket 02; literal `FollowUpRequest` pada `followUpRequest.test.ts`, `handOffDelivery.test.ts`, dan `adminChannel.test.ts` disesuaikan (ditambah `notedQuestions: []`).
- Pertanyaan yang menyela pengumpulan: penanda `PERTANYAAN` (kata tanya lazim, kata "tanya/info/cek", atau tanda tanya) membedakan pertanyaan dari jawaban bidang. Pertanyaan Harga Indikatif dijawab dan pertanyaan non-harga dicatat — keduanya tidak mengisi bidang yang sedang ditanya, dan prompt bidang diulang. Jawaban bidang yang kebetulan memuat kata harga (mis. "biaya hotel ditanggung kami, visa diurus sendiri") tetap disimpan verbatim; aturan lama "klasifikasi diabaikan saat pengumpulan" dipertahankan untuk kasus selain pertanyaan. Hal yang sama berlaku saat menunggu persetujuan: pertanyaan non-harga tetap dicatat, dan balasan tetap meminta konfirmasi.
- Pemicu handoff non-darurat (`booking-or-payment`, `agency-or-corporate`, `custom-quote-or-availability`, `unsupported-question`) tetap memakai alur handoff yang berlaku (persetujuan + penerusan), sesuai ketentuan spesifikasi lama yang tidak dilampaui. Hanya `emergency`, `active-trip`, `human-request` yang menyela pengumpulan. Draft yang sedang berjalan saat menyela tidak ikut dibawa (riwayat percakapan tetap diteruskan); pemulihan/pembaruan setelah handoff menjadi lingkup tiket 05.
- Penyesuaian sadar tes yang mengasumsikan jawaban FAQ non-harga (alasan: ADR-0009 menonaktifkan jawaban non-harga dari jalur runtime):
  - `tests/conversation/faqAnswer.test.ts` — loop per topik kini memastikan jawaban materi TIDAK muncul, balasan mengarahkan ke intake, dan tidak ada handoff; ditambah tes bahwa pertanyaan tercatat dan terbawa ke Ringkasan Kebutuhan. Tes penjaga penawaran/ketersediaan dipertahankan.
  - `tests/conversation/otherProfileServicesFaq.test.ts` — hal yang sama untuk layanan lain; tes agen/korporasi, informasi tak tersedia, harga, dan penawaran dipertahankan tanpa perubahan.
  - `tests/transport/handOffDelivery.test.ts` — "FAQ dijawab dan dihitung" dipecah: pertanyaan non-harga tidak dijawab/dihitung (`faqAnswered: 0`), jalur "dihitung tanpa handoff" dipindahkan ke pertanyaan Harga Indikatif (`faqAnswered: 1`).
  - `tests/transport/cutoverParity.test.ts` — "jalur FAQ tetap berfungsi" menjadi "jalur pertanyaan non-harga dan intake tetap berfungsi" (tanpa jawaban materi, `faqAnswered: 0`); uji paritas antar-nomor tetap membandingkan perilaku identik antar konfigurasi.
- Tes baru: `tests/conversation/intakeSebagaiAlurUtama.test.ts` (13 kasus) — pengumpulan berjalan tanpa pola pembuka, pertanyaan non-harga dicatat (ID/EN, termasuk saat pengumpulan dan saat menunggu persetujuan), Harga Indikatif tetap terjawab (termasuk saat pengumpulan tanpa mengisi bidang), penjaga jawaban bidang bermuatan kata harga, serta `emergency`/`active-trip`/`human-request` yang menyela pengumpulan.
- Di luar lingkup tiket ini (sengaja dibiarkan): kebocoran teks "requestSummary" pada pesan calon jemaah (tiket 03), desain bidang kebutuhan dan menu layanan (tiket 02), disclaimer Harga Indikatif (tiket 04), pembaruan kebutuhan setelah handoff (tiket 05).
