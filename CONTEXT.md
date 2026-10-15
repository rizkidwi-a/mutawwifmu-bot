# Layanan Pelanggan MUTAWWIFMU

Konteks ini memuat istilah bisnis MUTAWWIFMU saat calon jemaah langsung mencari informasi sebelum melakukan pemesanan. Cakupan layanannya mengikuti penawaran dalam profil perusahaan.

## Perjalanan Umrah

**Calon Jemaah**:
Individu atau keluarga yang sedang mempertimbangkan perjalanan umrah dan meminta informasi langsung dari MUTAWWIFMU sebelum melakukan pemesanan.
_Avoid_: pelanggan, jika yang dimaksud sebenarnya agen travel atau korporasi

**Private Premium Umrah**:
Layanan perjalanan umrah privat MUTAWWIFMU yang mencakup pengaturan layanan darat di Tanah Suci; detail akomodasi dan layanan lainnya mengikuti penawaran yang berlaku.
_Avoid_: paket umrah, jika detail paket belum dipastikan

**Land Arrangement**:
Pengelolaan kebutuhan perjalanan di destinasi, seperti akomodasi, transportasi, pemanduan ibadah, dan airport handling.
_Avoid_: tiket pesawat, jika yang dimaksud hanya layanan darat

**Pertanyaan Pra-Pemesanan**:
Pertanyaan atau permintaan informasi sebelum calon jemaah mengonfirmasi pemesanan. Ini berbeda dari bantuan untuk perjalanan yang sudah dipesan atau sedang berlangsung.
_Avoid_: dukungan perjalanan aktif

**Permintaan Tindak Lanjut**:
Permintaan dari calon jemaah sebelum booking yang memerlukan konsultasi lanjutan dari admin MUTAWWIFMU.
_Avoid_: konfirmasi pemesanan

**Ringkasan Kebutuhan**:
Rangkuman kebutuhan Calon Jemaah hasil Permintaan Tindak Lanjut yang diteruskan kepada admin untuk ditindaklanjuti.
_Avoid_: quotation, penawaran (produk admin setelah konsultasi)

**Pembaruan Kebutuhan**:
Perubahan atau penambahan kebutuhan yang disampaikan Calon Jemaah setelah Ringkasan Kebutuhan terkirim, yang dikirim ulang kepada admin dengan penanda "PEMBARUAN".
_Avoid_: prospek baru, jika yang dimaksud revisi Permintaan Tindak Lanjut yang sudah terkirim

**Pertanyaan Menyela**:
Pertanyaan yang disampaikan Calon Jemaah di tengah bot sedang menanyakan kebutuhan dan ditandai kata kunci seperti "ingin bertanya" atau "ada yang ingin ditanyakan". Isinya disimpan apa adanya di Bagian Pertanyaan dan dikonfirmasi admin; tidak pernah menjadi jawaban bidang.
_Avoid_: pertanyaan non-harga biasa (tanpa kata kunci); Harga Indikatif

**Bagian Pertanyaan**:
Kumpulan pertanyaan Calon Jemaah pada Ringkasan Kebutuhan (baris "Pertanyaan yang dicatat") yang dibawa kepada admin untuk dikonfirmasi dan ditindaklanjuti.
_Avoid_: FAQ, jika yang dimaksud jawaban dari materi

**Perbaikan Bidang**:
Permintaan Calon Jemaah untuk mengosongkan dan mengulang jawaban bagian tertentu Permintaan Tindak Lanjut (mis. "hapus bagian tanggal"); bot meminta ulang jawaban bagian itu lalu alur kembali ke state sebelumnya.
_Avoid_: Pembaruan Kebutuhan; reset seluruh Permintaan Tindak Lanjut

**Menu Tujuan Chat**:
Pembuka percakapan baru yang menyapa pengirim — membalas salam bila pesannya berisi salam, selain itu sapaan netral — dan menawarkan pilihan tujuan kontak: calon jemaah/informasi paket (lanjut ke intake), vendor/mitra bisnis, tim internal Mutawwifmu, atau keperluan lain; tiga pilihan terakhir langsung diteruskan ke admin tanpa menjalani intake calon jemaah.
_Avoid_: menu lanjutan (menu pasca-handoff untuk memperbarui atau mengulang percakapan)

**Menu Lanjutan**:
Balasan pasca-handoff yang ditawarkan kepada Calon Jemaah saat Ringkasan Kebutuhan sudah terkirim dan pesannya tidak cocok penanganan spesifik; isinya menyebut cara memperbarui bagian tertentu dengan kata kunci (Perbaikan Bidang) dan cara mengulang percakapan.
_Avoid_: menu tujuan chat (menu pembuka untuk memilih tujuan kontak)

**Ulangi Percakapan**:
Permintaan memulai percakapan dari awal (mis. balas "ulangi") setelah Ringkasan Kebutuhan terkirim atau setelah percakapan diteruskan ke admin lewat menu tujuan (vendor/mitra, tim internal, keperluan lain); bot kembali menampilkan pembuka layanan dan menu tujuan chat dengan Permintaan Tindak Lanjut baru yang kosong.
_Avoid_: Perbaikan Bidang; Pembaruan Kebutuhan

## Penawaran

**Harga Indikatif**:
Angka harga dalam materi MUTAWWIFMU yang menjadi referensi awal, bukan penawaran final. Satuan, periode berlaku, ketentuan, dan ketersediaannya dapat memerlukan konfirmasi admin.
_Avoid_: harga final, harga terkonfirmasi

**Layanan MUTAWWIFMU**:
Layanan yang tercantum di profil perusahaan: mutawwif outsourcing, tour guide, visa dan dokumen, hotel dan akomodasi, transportasi, airport handling, charity program, dukungan multibahasa, fotografi dan videografi, serta custom itinerary.
_Avoid_: hanya layanan hotel, jika yang dimaksud seluruh katalog perusahaan

**Tasreh**:
Izin masuk Raudhah yang diurus MUTAWWIFMU dan diterbitkan dalam bentuk barcode sesuai jadwal yang tersedia; angkanya termasuk Harga Indikatif.
_Avoid_: Nusuk — aplikasi resmi tempat jemaah mengajukan izin masuk; tasreh adalah layanan pengurusannya, bukan aplikasinya_

## Operasional Admin

**Jeda Percakapan**:
Keadaan bot berhenti membalas satu Calon Jemaah karena percakapan sedang ditangani admin secara manual; pesan yang masuk selama jeda tetap dicatat ke transkrip apa adanya, tetapi tidak dibalas dan tidak mengubah state alur percakapan.
_Avoid_: blokir pelanggan, mode senyap

**Ambil Alih**:
Tindakan admin mengambil alih percakapan dari bot dengan menjeda kontak tersebut, sehingga admin membalas langsung dari nomor bot tanpa direbut balasan otomatis.
_Avoid_: takeover; handoff (handoff adalah penerusan percakapan ke admin, bukan pengambilalihan balasan)

**Nonaktif Sementara**:
Keadaan bot berhenti membalas semua kontak tanpa mematikan proses; diaktifkan dan diakhiri lewat perintah admin, dan state-nya bertahan saat proses restart.
_Avoid_: shutdown, mati total
