# 06: Regresi end-to-end dari dialog nyata chat.md

**What to build:** Pakai dialog nyata `data/chat.md` sebagai skenario tes regresi: setiap pesan calon jemaah diproses lewat seam `handleInbound` dan hasilnya diperiksa — tidak ada pesan yang salah dijawab topik lain (tidak ada misfire), pesan informasi tidak dijawab template yang tidak nyambung, dan kebutuhan utama skenario (tanggal, pax, layanan, kebutuhan visa, rute) muncul lengkap pada ringkasan admin.

**Blocked by:** 03: Ringkasan kebutuhan yang rapi untuk admin; 04: Penegasan bahwa Harga Indikatif dapat berubah setelah diperiksa admin

**Status:** ready-for-agent

- [ ] Skenario multi-giliran dari `data/chat.md` (minimal: pembukaan, penyebutan tanggal/pax/layanan, pertanyaan harga, perubahan kebutuhan) berjalan tanpa error.
- [ ] Tidak ada balasan yang berasal dari topik FAQ non-harga.
- [ ] Pesan basa-basi dibalas singkat tanpa merusak alur intake; pesan pertanyaan yang tidak didukung terbawa ke admin.
- [ ] Ringkasan admin untuk skenario memuat seluruh kebutuhan utama yang disebutkan dalam dialog.
- [ ] Kumpulan kasus misfire pada `.scratch/eval-classify.txt` dijadikan kasus tes negatif.

## Comments

### Analisis awal (sesi 2026-10-08, sebelum implementasi)

Ditunda atas permintaan pemilik: uji coba jalankan bot dulu, evaluasi menyusul
(lihat `.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md`). Temuan
probe sementara (55 kasus `.scratch/eval-classify.txt` dijalankan lewat seam
`handleInbound`, konteks segar dan tengah-pengumpulan) agar tidak hilang:

- Tidak ada lagi balasan dari topik FAQ non-harga — kunci tiket 01 (ADR-0009)
  sudah menutup misfire kelas itu di seluruh 55 kasus.
- Satu misfire nyata tersisa: kasus `HARGA/price-hotel` ("sebenernya kita
  bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation to non
  refundable...") — pesan pernyataan, bukan pertanyaan harga — dijawab template
  Harga Indikatif hotel saat state `idle` maupun `sent`. Ini "pesan informasi
  dijawab template yang tidak nyambung". Usulan perbaikan: jawaban Harga
  Indikatif hanya untuk pesan bertanda pertanyaan; pernyataan bermuatan kata
  harga diperlakukan sebagai informasi/kebutuhan.
- Dua butir keputusan untuk dibahas saat evaluasi: (a) basa-basi saat
  pengumpulan ("makasi ya kak") kini mengisi bidang yang sedang ditanya —
  apakah cukup dibalas singkat dengan mengulang prompt bidang?; (b) pertanyaan
  non-harga yang routing-nya bukan `faq` (mis. "GMC nya itu bisa 7 seats ya..")
  saat pengumpulan kini juga mengisi bidang — apakah sebaiknya masuk
  `notedQuestions` seperti pertanyaan `faq`? Keduanya memengaruhi apakah
  Ringkasan Kebutuhan tetap bersih saat dialog nyata di-replay apa adanya.
