# WhatsApp Customer Service Chatbot MUTAWWIFMU

Status: ready-for-agent

## Problem Statement

Calon jemaah yang menghubungi MUTAWWIFMU melalui WhatsApp membutuhkan jawaban awal tentang layanan sebelum memesan. Informasi bisnis tersebar dalam materi perusahaan dengan cakupan layanan yang luas, dan sejumlah pertanyaan—terutama harga hotel—memerlukan konfirmasi admin. Tanpa batas yang jelas, jawaban otomatis berisiko dianggap sebagai penawaran final atau membuat janji yang tidak didukung materi.

## Solution

Sediakan asisten percakapan WhatsApp yang tersedia 24/7 untuk membantu calon jemaah langsung sebelum pemesanan. Asisten menjawab dalam Bahasa Indonesia atau Inggris mengikuti bahasa calon jemaah, menjelaskan semua layanan yang tercantum dalam profil perusahaan, dan mengumpulkan permintaan yang cukup lengkap agar tim customer service/penjualan dapat menindaklanjutinya.

Asisten hanya menjawab berdasarkan materi bisnis yang tersedia. Asisten dapat menyebut angka harga saat ini sebagai harga indikatif, dengan menyatakan secara jelas jika satuan atau ketentuannya belum terverifikasi. Asisten tidak menyelesaikan booking atau pembayaran, tidak menjanjikan ketersediaan atau waktu balasan admin, dan meneruskan kasus yang memerlukan manusia kepada admin setelah memperoleh persetujuan calon jemaah untuk meneruskan informasinya.

## User Stories

1. Sebagai calon jemaah, saya ingin memulai percakapan melalui nomor WhatsApp konsultasi MUTAWWIFMU, agar saya bisa bertanya tentang layanan melalui kanal yang sudah dikenal.
2. Sebagai calon jemaah, saya ingin memperoleh tanggapan FAQ kapan pun saya mengirim pesan, agar saya dapat mencari informasi awal di luar jam kerja admin.
3. Sebagai calon jemaah berbahasa Indonesia, saya ingin menerima jawaban dalam Bahasa Indonesia, agar informasi mudah saya pahami.
4. Sebagai calon jemaah berbahasa Inggris, saya ingin menerima jawaban dalam Bahasa Inggris, agar saya dapat berkonsultasi dalam bahasa yang nyaman bagi saya.
5. Sebagai calon jemaah, saya ingin jawaban mengikuti bahasa yang saya gunakan, agar percakapan terasa wajar tanpa harus memilih menu bahasa terlebih dahulu.
6. Sebagai calon jemaah, saya ingin mengetahui apa yang dimaksud layanan Private Premium Umrah dan Land Arrangement, agar saya memahami layanan yang sedang saya pertimbangkan.
7. Sebagai calon jemaah, saya ingin bertanya tentang mutawwif dan bahasa yang tersedia, agar saya dapat mengetahui jenis pendampingan yang ditawarkan.
8. Sebagai calon jemaah, saya ingin bertanya tentang tour guide dan destinasi yang dilayani, agar saya dapat mengetahui apakah kebutuhan perjalanan saya dapat dibantu.
9. Sebagai calon jemaah, saya ingin bertanya tentang visa dan pengurusan dokumen, agar saya dapat memahami layanan dokumen yang tercantum dalam penawaran.
10. Sebagai calon jemaah, saya ingin bertanya tentang hotel dan akomodasi di Mekkah dan Madinah, agar saya dapat mempertimbangkan pilihan yang sesuai.
11. Sebagai calon jemaah, saya ingin bertanya tentang transportasi dan jenis armada yang tercantum dalam materi perusahaan, agar saya memahami pilihan layanan darat.
12. Sebagai calon jemaah, saya ingin bertanya tentang airport handling saat kedatangan dan kepulangan, agar saya memahami bantuan bandara yang tersedia.
13. Sebagai calon jemaah, saya ingin bertanya tentang charity program, agar saya mengetahui layanan sosial yang dapat menjadi bagian dari perjalanan.
14. Sebagai calon jemaah, saya ingin bertanya tentang dukungan multibahasa, agar saya mengetahui pilihan bahasa layanan yang ditawarkan perusahaan.
15. Sebagai calon jemaah, saya ingin bertanya tentang fotografer dan videografer, agar saya mengetahui pilihan dokumentasi perjalanan.
16. Sebagai calon jemaah, saya ingin meminta informasi tentang custom itinerary, agar saya mengetahui apakah rute dan kebutuhan perjalanan dapat disesuaikan.
17. Sebagai calon jemaah, saya ingin menanyakan harga yang tercantum dalam materi perusahaan, agar saya mendapat gambaran awal sebelum meminta penawaran.
18. Sebagai calon jemaah, saya ingin mengetahui bila satuan, periode, atau ketentuan suatu angka harga belum jelas, agar saya tidak mengira harga indikatif sebagai harga final.
19. Sebagai calon jemaah, saya ingin mendapat penjelasan bahwa daftar harga hotel memuat keterangan satuan yang berbeda antara sampul dan tabel, agar admin dapat mengonfirmasi harga yang benar sebelum saya mengambil keputusan.
20. Sebagai calon jemaah, saya ingin menanyakan periode perjalanan dan tipe kamar yang terkait dengan daftar harga, agar admin dapat memeriksa kecocokan informasi sebelum memberi konfirmasi.
21. Sebagai calon jemaah, saya ingin bertanya tentang informasi pemesanan dan pembayaran yang tercantum dalam materi, agar saya memahami ketentuannya tanpa menganggap bahwa bot dapat melakukan transaksi.
22. Sebagai calon jemaah, saya ingin menyampaikan layanan atau tujuan yang diminati, tanggal atau periode perjalanan, jumlah jemaah, dan kebutuhan utama, agar permintaan saya cukup jelas untuk ditindaklanjuti admin.
23. Sebagai calon jemaah, saya ingin dapat menyebutkan kisaran anggaran secara opsional, agar admin dapat mempertimbangkannya tanpa menjadikan anggaran sebagai syarat untuk bertanya.
24. Sebagai calon jemaah, saya ingin tidak diminta mengirim data paspor atau informasi kesehatan saat konsultasi awal, agar saya tidak perlu membagikan data sensitif untuk memperoleh informasi.
25. Sebagai calon jemaah, saya ingin diberi tahu sebelum informasi saya diteruskan kepada admin dan dapat menyetujui atau menolak, agar saya mengetahui dan mengendalikan penggunaan informasi tersebut.
26. Sebagai calon jemaah, saya ingin menerima konfirmasi bahwa permintaan saya telah diteruskan, agar saya tahu apa yang terjadi setelah memberikan persetujuan.
27. Sebagai calon jemaah, saya ingin tidak diberi janji waktu balasan admin yang belum ditetapkan, agar ekspektasi saya tetap akurat.
28. Sebagai calon jemaah, saya ingin meminta berbicara dengan manusia kapan saja, agar saya dapat memperoleh bantuan langsung bila diperlukan.
29. Sebagai calon jemaah, saya ingin diarahkan ke admin jika jawaban tidak tersedia, tidak pasti, atau membutuhkan pemeriksaan, agar bot tidak mengarang informasi.
30. Sebagai calon jemaah, saya ingin permintaan penawaran khusus atau konfirmasi harga dan ketersediaan diteruskan ke admin, agar hanya tim yang berwenang memberikan konfirmasi akhir.
31. Sebagai calon jemaah, saya ingin diarahkan ke admin bila menanyakan booking atau pembayaran, agar bot tidak membuat atau mengubah transaksi.
32. Sebagai calon jemaah, saya ingin diarahkan ke admin bila pertanyaan saya berkaitan dengan perjalanan yang sudah berlangsung atau keadaan darurat, agar kasus di luar cakupan pra-pemesanan ditangani manusia.
33. Sebagai calon jemaah, saya ingin pertanyaan yang berkaitan dengan layanan perusahaan tetap dijawab bila didukung materi, agar cakupan bot tidak terbatas pada informasi hotel saja.
34. Sebagai calon jemaah, saya ingin tahu bila pertanyaan saya tidak dapat dijawab dari materi yang tersedia, agar saya mendapat jalur tindak lanjut yang jelas.
35. Sebagai admin customer service/penjualan, saya ingin menerima permintaan yang disetujui calon jemaah beserta informasi layanan/tujuan, tanggal atau periode, jumlah jemaah, kebutuhan utama, serta anggaran bila diberikan, agar saya dapat melanjutkan konsultasi tanpa meminta ulang informasi dasar.
36. Sebagai admin customer service/penjualan, saya ingin mengetahui alasan percakapan diteruskan, agar saya dapat memahami apakah calon jemaah meminta manusia, memerlukan pemeriksaan harga, atau menanyakan hal di luar cakupan bot.
37. Sebagai admin customer service/penjualan, saya ingin dapat memeriksa kembali angka harga indikatif dan satuannya sebelum memberikan penawaran, agar perbedaan keterangan di materi tidak berubah menjadi janji harga yang salah.
38. Sebagai tim MUTAWWIFMU, saya ingin jawaban bot mengikuti materi bisnis yang telah disediakan dan diperbarui, agar jawaban merefleksikan informasi perusahaan alih-alih asumsi bot.
39. Sebagai tim MUTAWWIFMU, saya ingin permintaan agen travel dan korporasi/institusi diteruskan ke admin, agar bot tetap fokus pada calon jemaah langsung tanpa mengabaikan pertanyaan segmen lain.
40. Sebagai pemilik layanan, saya ingin menilai jumlah permintaan calon jemaah yang cukup lengkap untuk ditindaklanjuti sebagai ukuran utama, serta FAQ yang terjawab tanpa admin sebagai ukuran pendamping, agar keberhasilan tahap awal sesuai tujuan bisnis yang disepakati.

## Implementation Decisions

- Pengguna utama adalah calon jemaah yang menghubungi MUTAWWIFMU secara langsung sebelum memesan. Pertanyaan dari agen travel dan korporasi/institusi diteruskan ke admin.
- Bot menjelaskan seluruh sepuluh layanan yang tercantum dalam profil perusahaan: mutawwif outsourcing, tour guide, visa dan dokumen, hotel dan akomodasi, transportasi, airport handling, charity program, dukungan multibahasa, fotografi dan videografi, serta custom itinerary.
- Cakupan percakapan bot adalah pertanyaan pra-pemesanan. Bot menjawab FAQ dan mengumpulkan Permintaan Tindak Lanjut; bot tidak menyelesaikan booking atau pembayaran.
- Bot melayani Bahasa Indonesia dan Inggris serta menanggapi dalam bahasa yang digunakan calon jemaah. Gaya bahasanya hangat, santun, ringkas, dan profesional.
- Jawaban harus didukung materi bisnis yang tersedia. Jika informasi tidak tersedia atau tidak pasti, bot mengakuinya dan meneruskan percakapan ke admin, bukan mengarang jawaban.
- Bot tersedia 24/7 untuk FAQ dan menerima permintaan. Admin customer service/penjualan menindaklanjuti; bot tidak menjanjikan tenggat balasan admin.
- Untuk Permintaan Tindak Lanjut, bot mengumpulkan layanan/tujuan yang diminati, tanggal atau periode perjalanan, jumlah jemaah, dan kebutuhan utama. Kisaran anggaran bersifat opsional. Bot tidak meminta data paspor atau informasi kesehatan untuk konsultasi awal.
- Bot meminta persetujuan calon jemaah sebelum meneruskan informasi kepada admin. Jika persetujuan ditolak, informasi tersebut tidak diteruskan.
- Angka yang tersedia saat ini boleh digunakan sebagai Harga Indikatif dengan peringatan yang jelas jika satuan, periode, atau ketentuan belum terverifikasi. Materi hotel menyebut harga per orang di sampul dan per kamar di bagian tabel; bot harus menjelaskan bahwa satuannya belum terverifikasi dan admin perlu mengonfirmasinya. Bot tidak menjanjikan harga final atau ketersediaan.
- Kasus diteruskan kepada admin bila calon jemaah meminta manusia; informasi tidak tersedia/tidak pasti; diperlukan penawaran khusus atau konfirmasi harga/ketersediaan; penanya adalah agen/korporasi; atau pertanyaan berkaitan dengan booking, pembayaran, perjalanan yang sedang berlangsung, maupun keadaan darurat.
- Nomor `+62 895 0700 3830` digunakan untuk pengembangan. Nomor produksi akan dipilih setelah pengguna memiliki akses; nomor pengirim harus dapat diganti melalui konfigurasi tanpa mengubah perilaku percakapan. Nomor konsultasi pada profil perusahaan tidak diasumsikan tersedia untuk digunakan.
- Seam pengujian yang disepakati adalah batas pemrosesan pesan masuk yang menerima pesan dan konteks percakapan lalu menghasilkan balasan serta tindakan yang terlihat, seperti mencatat permintaan atau meneruskan percakapan. Seam ini bersifat provider-agnostic.
- Belum diputuskan provider/API WhatsApp, mekanisme penyimpanan percakapan dan permintaan, kanal/inbox admin untuk menerima handoff, framework aplikasi, atau kebijakan retensi data. Keputusan tersebut tidak boleh diasumsikan dalam implementasi.

## Testing Decisions

- Tes harus memeriksa perilaku yang terlihat dari batas pemrosesan pesan masuk, bukan detail implementasi, prompt internal, parser, atau struktur data privat.
- Seam utama yang diuji adalah pesan masuk beserta konteks percakapan menghasilkan balasan yang sesuai dan tindakan yang benar: jawaban FAQ, permintaan data lanjutan, permintaan persetujuan, pencatatan permintaan, atau handoff ke admin.
- Cakupan perilaku utama meliputi jawaban Bahasa Indonesia dan Inggris; jawaban hanya dari materi; tidak mengarang saat data tidak ada; pengumpulan bidang permintaan yang disepakati; anggaran opsional; larangan meminta data sensitif; dan penghentian penerusan bila persetujuan tidak diberikan.
- Tes harga harus memastikan angka hotel yang ambigu disertai penjelasan bahwa satuannya belum terverifikasi dan perlu dikonfirmasi admin, serta tidak dianggap sebagai harga final atau jaminan ketersediaan.
- Tes handoff harus mencakup permintaan berbicara dengan manusia, informasi yang tidak didukung/tidak pasti, permintaan penawaran atau ketersediaan, segmen agen/korporasi, booking/pembayaran, perjalanan aktif, dan keadaan darurat.
- Belum ada kode aplikasi, test suite, framework pengujian, atau contoh tes serupa di direktori ini. Tes baru akan menjadi prior art dan harus mengikuti seam yang telah disepakati.
- Integrasi transport WhatsApp yang sebenarnya memerlukan tes kontrak/adapter setelah provider dipilih; tes tersebut tidak menggantikan tes perilaku pada seam percakapan utama.

## Out of Scope

- Melayani workflow agen travel atau korporasi/institusi secara otomatis; pertanyaan dari segmen tersebut hanya diteruskan ke admin.
- Dukungan otomatis untuk booking yang sudah dikonfirmasi, pembayaran, perubahan transaksi, atau layanan perjalanan yang sedang berlangsung.
- Menangani keadaan darurat melalui bot; bot meneruskan kasus tersebut kepada manusia.
- Memberikan penawaran final, menjamin ketersediaan hotel/layanan, atau menyelesaikan transaksi.
- Meminta atau memproses data paspor maupun informasi kesehatan dalam konsultasi pra-pemesanan.
- Mengirim kampanye atau pesan pemasaran proaktif yang tidak dimulai calon jemaah.
- Mengarang informasi tentang layanan, visa, hotel, harga, atau ketentuan yang tidak didukung materi perusahaan.

## Further Notes

- Materi bisnis yang tersedia mencakup profil perusahaan dan daftar harga hotel. Profil memuat sepuluh layanan dan beberapa segmen pelanggan; cakupan bot sengaja dibatasi pada calon jemaah langsung, tetapi dapat menjelaskan semua layanan profil.
- Daftar harga hotel mengandung konflik satuan antara sampul dan keterangan tabel. Angka saat ini tetap boleh disebut sebagai indikasi dengan peringatan satuan belum terverifikasi; data dapat diperbarui kemudian.
- Nomor pengembangan yang disediakan pengguna adalah `+62 895 0700 3830`. Nomor konsultasi pada profil adalah `+62 877 4587 3159`, tetapi saat ini tidak berada dalam kendali pengguna dan tidak boleh dijadikan prasyarat pengembangan. Nomor produksi akan dikonfirmasi dan diverifikasi sebelum cutover.
- Direktori saat ini belum memiliki aplikasi, framework, test suite, atau riwayat ADR. Pemilihan provider WhatsApp, cara admin menerima handoff, penyimpanan/retensi data, serta framework perlu diselesaikan pada tahap implementasi/tiket yang relevan.
- Issue tracker repo ini menggunakan Markdown lokal. Spec ini berstatus `ready-for-agent`; tiket implementasi berikutnya sebaiknya dibuat terpisah dan mencatat blocking edges.
