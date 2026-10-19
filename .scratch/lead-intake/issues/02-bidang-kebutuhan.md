# 02: Bidang kebutuhan yang lengkap untuk konsultasi land arrangement

**What to build:** Permintaan Tindak Lanjut mengumpulkan bidang yang cukup bagi admin memulai konsultasi: layanan yang diminati (dari menu Layanan MUTAWWIFMU), tanggal/periode perjalanan, jumlah jemaah, kebutuhan detail (kebutuhan visa per jemaah, rute/asal keberangkatan, hotel mandiri vs lewat kami, catatan), serta kisaran anggaran opsional. Nilai disimpan apa adanya dari calon jemaah.

**Blocked by:** 01: Jadikan intake kebutuhan sebagai alur utama percakapan

**Status:** resolved

- [x] Langkah pertama menampilkan menu layanan (mutawwif, visa & dokumen, hotel, transportasi, airport handling, ziarah/city tour, tasreh, fotografi, lainnya) sehingga calon jemaah tahu apa yang bisa diminta.
- [x] Pertanyaan berurutan; bidang opsional (anggaran) dapat dilewati; jawaban bebas tetap diterima tanpa dipaksa ke pilihan.
- [x] Kebutuhan detail dapat diisi dalam satu jawaban panjang (mis. "yang butuh visa cuma bapak & ibu mertua, terbang dari Jakarta") tanpa dipotong atau ditafsirkan ulang.
- [x] Nilai bidang disimpan verbatim; tidak ada komponen generatif yang memparafrase data jemaah.
- [x] Larangan meminta data paspor/kesehatan tetap berlaku; prompt tidak memintanya.
- [x] Tipe `FollowUpRequest` diperbarui secara eksplisit (perubahan seam dicatat di Comments) dan seluruh pemakai lama ikut disesuaikan.

## Comments

- Perubahan seam: seam `handleInbound(message, context)` **tidak berubah**; yang berubah adalah bentuk tipe `FollowUpRequest` yang dibawanya. `serviceOrDestination` → `interestedServices` (layanan yang diminati dari menu Layanan MUTAWWIFMU) dan `mainNeeds` → `detailedNeeds` (kebutuhan detail); `travelDateOrPeriod`, `travellerCount`, `budgetRange`, dan `notedQuestions` tetap. Pemakai lama yang disesuaikan: `src/conversation/handleInbound.ts` (draft, `toFollowUpRequest`, `promptForNextField`, `requestSummary`), `src/adminChannel.ts` (`requestLines`), literal `FollowUpRequest` pada `tests/adminChannel.test.ts` dan `tests/transport/handOffDelivery.test.ts`, asersi `/kebutuhan utama/` → `/kebutuhan detail/` pada `tests/conversation/followUpRequest.test.ts` dan `tests/conversation/intakeSebagaiAlurUtama.test.ts`, serta daftar bidang di `README.md`.
- Menu layanan pada langkah pertama: prompt `COLLECT_INTERESTED_SERVICES_*` menampilkan sembilan item menu di bawah judul "Menu Layanan MUTAWWIFMU" (ID) / "MUTAWWIFMU service menu" (EN). Menu bersifat penerangan, bukan pilihan paksa: jawaban bebas (mis. "lainnya: umrah keluarga sambil city tour") tetap diterima dan disimpan apa adanya.
- Kebutuhan detail dalam satu jawaban panjang: prompt `COLLECT_DETAILED_NEEDS_*` memberi tahu rincian yang boleh disampaikan sekaligus (kebutuhan visa per jemaah, rute atau asal keberangkatan, hotel pesan sendiri atau lewat kami, catatan khusus). Jawaban panjang disimpan utuh sebagai satu nilai `detailedNeeds` — tanpa dipotong, tanpa ditafsirkan ulang (tes `tests/conversation/bidangKebutuhan.test.ts` memakai contoh pada tiket ini).
- Verbatim: alur intake tidak memiliki komponen generatif; `fillNextField` menyalin teks calon jemaah apa adanya ke bidang, dan ringkasan menampilkan nilai tersebut tanpa parafrase.
- Larangan data paspor/kesehatan: prompt bidang tidak memintanya; tes regresi lama yang memeriksa seluruh balasan tetap lolos, dan tes baru memeriksa prompt kebutuhan detail secara khusus.
- Tes baru: `tests/conversation/bidangKebutuhan.test.ts` (menu layanan ID/EN, jawaban bebas tanpa dipaksa memilih menu, rincian pada prompt kebutuhan detail, jawaban panjang tersimpan utuh verbatim pada `FollowUpRequest`).
