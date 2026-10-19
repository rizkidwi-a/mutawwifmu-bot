# Lead Intake: Kebutuhan Calon Jemaah untuk Admin

Status: needs-triage

## Problem Statement

Konsultasi penjualan land arrangement (lihat `data/Vira Arman/chat.md`) tidak dapat digantikan oleh jawaban FAQ otomatis: pertanyaannya multi-giliran, kontekstual, dan memerlukan pengetahuan operasional di luar materi bisnis. Evaluasi pada `.scratch/eval-classify.txt` menunjukkan corpus yang ada justru menghasilkan jawaban salah konteks pada sebagian pesan. Yang dibutuhkan admin bukan jawaban bot yang mendalam, melainkan ringkasan kebutuhan calon jemaah yang siap ditindaklanjuti.

## Solution

Batasi fungsi bot menjadi tiga: merespons cepat setiap chat masuk, menanyakan kebutuhan calon jemaah, lalu mengirim ringkasan kebutuhan tersebut ke nomor admin (ADR-0009). Bot boleh menyebut kisaran harga dari materi sebagai Harga Indikatif dengan penegasan bahwa angka dapat berubah setelah diperiksa admin. Semua pertanyaan lain tidak dijawab dari corpus — dicatat sebagai bagian kebutuhan dan diteruskan kepada admin.

## Ruang Lingkup

1. **Respons cepat.** Setiap chat masuk dibalas cepat dalam bahasa calon jemaah (ID/EN), lalu diarahkan ke pengumpulan kebutuhan.
2. **Pengumpulan kebutuhan (Permintaan Tindak Lanjut).** Bidang yang ditanya berurutan, dengan jawaban disimpan apa adanya:
   - Layanan yang diminati (menu dari Layanan MUTAWWIFMU: mutawwif, visa & dokumen, hotel, transportasi, airport handling, ziarah/city tour, tasreh, fotografi, lainnya);
   - Tanggal atau periode perjalanan;
   - Jumlah jemaah (termasuk keterangan anak/lansia bila disebutkan);
   - Kebutuhan detail (kebutuhan visa per jemaah, rute/asal keberangkatan, hotel pesan mandiri atau lewat kami, catatan khusus).

   Pertanyaan kisaran anggaran dihapus dari urutan pengumpulan: setelah kebutuhan detail dijawab, bot langsung menampilkan Ringkasan Kebutuhan dan meminta persetujuan penerusan ke admin. Bidang `budgetRange` tetap ada pada tipe, tetapi barisnya tidak lagi ditampilkan pada Ringkasan Kebutuhan maupun pesan admin.
3. **Ringkasan untuk admin.** Ringkasan per bidang ditampilkan kepada calon jemaah, meminta persetujuan penerusan, lalu dikirim ke nomor admin bersama identitas pengirim dan alasan handoff; riwayat percakapan tidak disertakan (ADR-0010). Handoff tanpa Permintaan Tindak Lanjut tetap mengirim identitas dan alasan, tanpa riwayat.
4. **Harga Indikatif.** Pertanyaan harga yang angkanya tercantum materi dijawab dengan Harga Indikatif, selalu dengan penegasan bahwa angka bersifat indikatif dan dapat berubah setelah diperiksa admin.
5. **Pembaruan kebutuhan.** Setelah ringkasan terkirim, calon jemaah masih dapat menambah atau mengubah kebutuhan; ringkasan yang diperbarui dikirim ulang ke admin dengan penanda pembaruan (keputusan rinci pada tiket 05).
6. **Pesan non-teks.** Gambar/dokumen (mis. bukti booking, bukti transfer) diakui penerimaannya dan dicatat sebagai lampiran pada ringkasan, tanpa bot menafsirkan isinya.

## Di Luar Lingkup

- Menjawab FAQ non-harga (profil layanan, ketentuan, proses) — diarahkan ke admin sebagai bagian kebutuhan.
- Quotation, invoice, booking, pembayaran, perubahan data, dan konfirmasi ketersediaan/harga final.
- Permintaan data paspor atau informasi kesehatan (larangan pada spesifikasi lama tetap berlaku).
- Perjalanan aktif, darurat, dan permintaan berbicara dengan manusia — tetap menyela langsung ke handoff.

## Testing Decisions

- Seam tetap `handleInbound(message, context)`; state alur diturunkan dari riwayat percakapan agar seam murni.
- Nilai bidang disimpan apa adanya dari calon jemaah; tidak ada parafrase atau penafsiran otomatis atas data jemaah.
- Pesan yang menyela pengumpulan ditangani menurut jenisnya (tiket 06): basa-basi dibalas singkat tanpa mengisi bidang; pertanyaan — termasuk yang tidak didukung — dicatat sebagai bagian kebutuhan dan dibawa ke admin; pernyataan bermuatan kata harga diperlakukan sebagai informasi/kebutuhan, dan Harga Indikatif hanya dijawab untuk pesan bertanda pertanyaan.
- Regresi end-to-end memakai dialog nyata dari `data/` (mulai `data/Vira Arman/chat.md`, tiket 06): tidak ada pesan yang salah dijawab topik lain; setiap kebutuhan utama skenario muncul pada ringkasan admin.
- Invarian yang dipertahankan: tanpa klaim harga final, tanpa janji ketersediaan/waktu balasan admin, tanpa data sensitif.

## Referensi

- Keputusan lingkup: `docs/adr/0009-fokus-intake-kebutuhan.md`
- Spesifikasi lama (bagian alur percakapan dilampaui; ketentuan kanal/persetujuan/larangan data tetap berlaku): `.scratch/whatsapp-customer-service-chatbot/spec.md`
- Evaluasi percakapan nyata: `.scratch/eval-classify.txt` (sumber: `data/Vira Arman/chat.md`)
- Analisis pencocokan transkrip dengan korpus: `.scratch/pencocokan-korpus-transkrip/analisis.md`; kasus uji dari transkrip nyata: `tests/korpus/transkrip-nyata.json` (tindak lanjut pada tiket 08–10)
