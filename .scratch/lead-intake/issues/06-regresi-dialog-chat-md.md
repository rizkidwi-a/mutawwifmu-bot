# 06: Regresi end-to-end dari dialog nyata chat.md

**What to build:** Pakai dialog nyata `data/chat.md` sebagai skenario tes regresi: setiap pesan calon jemaah diproses lewat seam `handleInbound` dan hasilnya diperiksa — tidak ada pesan yang salah dijawab topik lain (tidak ada misfire), pesan informasi tidak dijawab template yang tidak nyambung, dan kebutuhan utama skenario (tanggal, pax, layanan, kebutuhan visa, rute) muncul lengkap pada ringkasan admin.

**Blocked by:** 03: Ringkasan kebutuhan yang rapi untuk admin; 04: Penegasan bahwa Harga Indikatif dapat berubah setelah diperiksa admin

**Status:** resolved

- [x] Skenario multi-giliran dari `data/chat.md` (minimal: pembukaan, penyebutan tanggal/pax/layanan, pertanyaan harga, perubahan kebutuhan) berjalan tanpa error.
- [x] Tidak ada balasan yang berasal dari topik FAQ non-harga.
- [x] Pesan basa-basi dibalas singkat tanpa merusak alur intake; pesan pertanyaan yang tidak didukung terbawa ke admin.
- [x] Ringkasan admin untuk skenario memuat seluruh kebutuhan utama yang disebutkan dalam dialog.
- [x] Kumpulan kasus misfire pada `.scratch/eval-classify.txt` dijadikan kasus tes negatif.

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

### Keputusan dua butir terbuka (sesi implementasi tiket 06)

Kedua butir di atas diputuskan mengikuti kriteria tiket ini ("pesan basa-basi
dibalas singkat tanpa merusak alur intake; pesan pertanyaan yang tidak
didukung terbawa ke admin"), dan keduanya kini dijaga tes
`tests/conversation/pesanSela.test.ts`:

- **(a) basa-basi** — dibalas singkat dengan mengulang bidang yang sedang
  ditanya (atau permintaan konfirmasi yang sedang menunggu), tanpa mengisi
  bidang, tanpa dicatat sebagai perubahan, dan tanpa jawaban template. Deteksi
  didasarkan pada daftar kata sapaan/terima kasih/pengakuan singkat
  (`BASA_BASI_KATA` di `handleInbound.ts`) yang sengaja konservatif agar
  jawaban bidang tidak ikut tertelan.
- **(b) pertanyaan non-`faq`** — seluruh pesan bertanda pertanyaan (penanda
  `PERTANYAAN`) saat pengumpulan tidak lagi mengisi bidang: pertanyaan harga
  yang terdukung dijawab Harga Indikatif, dan selainnya dicatat apa adanya di
  `notedQuestions` ("Pertanyaan yang dicatat") sehingga terbawa ke admin,
  berapa pun routing-nya (`faq` maupun `handoff`). Pernyataan tanpa tanda
  pertanyaan tetap menjadi jawaban bidang/perubahan apa adanya.

### Perbaikan misfire yang tersisa (kasus HARGA/price-hotel)

Jawaban Harga Indikatif kini hanya untuk pesan bertanda pertanyaan. Pernyataan
bermuatan kata harga (kasus "sebenernya kita bukannya mau ganti hotel si.. cuma
ganti dari harga free cancellation to non refundable ...") diperlakukan sebagai
informasi/kebutuhan: menjadi jawaban bidang saat pengumpulan dan "Perubahan"
pada pembaruan setelah ringkasan terkirim — tidak pernah dijawab template
harga. Ini menutup misfire terakhir yang tercatat pada analisis awal (idle
maupun `sent`).

### Tes regresi yang ditambahkan

- `tests/regresi/regresiDialogNyata.test.ts` — skenario multi-giliran yang
  disusun dari `data/Vira Arman/chat.md` (dianonimkan: pembukaan, basa-basi,
  layanan, tanggal, pax, kebutuhan visa + rute, pertanyaan harga, anggaran,
  persetujuan, perubahan kebutuhan + persetujuan pembaruan), plus replay
  keempat transkrip di `data/` (Vira Arman, Cut Emelia, Evi N,
  `+62 812-1008-778`) bila `data/` tersedia — dilewati otomatis bila tidak,
  karena `data/` memuat data pribadi dan tidak ter-versioning.
- `tests/regresi/kasusMisfire.test.ts` — 55 kasus `.scratch/eval-classify.txt`
  sebagai kasus tes negatif pada tiga konteks (percakapan baru, tengah
  pengumpulan, setelah ringkasan terkirim): tidak boleh ada balasan template
  materi mana pun, dan kasus HARGA/price-hotel wajib masuk sebagai kebutuhan.
- `tests/conversation/pesanSela.test.ts` — perilaku pesan yang menyela
  pengumpulan (basa-basi, pernyataan harga, pertanyaan tidak didukung).
- Helper: `tests/regresi/transkrip.ts` (parser transkrip `data/`) dan
  `tests/regresi/temuanMisfire.ts` (deteksi balasan template).

### Kriteria dua temuan analisis (tiket 08 dan 09)

Sesuai pembaruan sumber regresi di atas, kedua temuan dijadikan kriteria pada
`tests/regresi/regresiDialogNyata.test.ts` sebagai tes bertanda `todo` yang
menunjuk tiket pemilik perbaikannya: over-faq (22 kasus `handoff` pada
`tests/korpus/transkrip-nyata.json` harus terklasifikasi `handoff`) milik
tiket 08, dan empat pertanyaan terdukung yang jatuh ke handoff milik tiket 09.
Keduanya adalah kriteria klasifikasi `classifyInbound`/`matchFaqTopic` — di
luar lingkup tiket ini — sehingga tiket 06 tidak menunggu perbaikannya. Sisi
seam yang bisa dijaga sekarang sudah hijau: tidak ada replay yang menjawab
template di luar pertanyaan harga terdukung, dan konteks penting tidak
hilang — pertanyaan tetap terbawa ke admin.

### Sumber regresi diperbarui (sesi 2026-10-10)

`data/chat.md` telah dipindah ke `data/Vira Arman/chat.md` — jalur tes pada tiket
ini ikut diperbarui. Selain itu tersedia tiga transkrip jemaah lain di `data/`
(Cut Emelia, Evi N, `+62 812-1008-778`) yang lebih kaya variasi bahasanya.
Hasil analisis pencocokannya dengan korpus ada di
`.scratch/pencocokan-korpus-transkrip/analisis.md`; 54 kasus nyata yang sudah
dianonimkan masuk `tests/korpus/transkrip-nyata.json` dan otomatis dijalankan
`node scripts/probe-cakupan.ts`. Saat skenario regresi direplay, gunakan keempat
transkrip sebagai sumber, dan jadikan dua temuan analisis sebagai kriteria:
misfire over-faq (tiket 08) dan pertanyaan terdukung yang jatuh ke handoff
(tiket 09).
