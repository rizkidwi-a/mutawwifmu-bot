# ADR-0009: Fokus bot pada respons cepat, intake kebutuhan, dan ringkasan untuk admin

Status: accepted

## Konteks

Evaluasi percakapan nyata admin–calon jemaah (`data/chat.md`, hasil klasifikasi di `.scratch/eval-classify.txt`) menunjukkan bahwa konsultasi penjualan land arrangement bersifat multi-giliran dan kontekstual, serta memunculkan pengetahuan operasional yang tidak ada di materi bisnis (alur approval hotel Nusuk, BRN, syarat visa, T&C). Dengan corpus yang ada, sebagian pesan salah dijawab oleh topik FAQ yang tidak relevan (misfire) dan sisanya hanya diteruskan ke admin. Pemilik memutuskan membatasi fungsi bot: merespons cepat, menanyakan kebutuhan calon jemaah, lalu meringkasnya untuk admin — tidak lebih dari itu; kisaran harga boleh disebut dengan catatan dapat berubah setelah diperiksa admin.

## Keputusan

Fungsi bot dibatasi menjadi tiga hal: (1) respons cepat atas setiap chat masuk, (2) pengumpulan kebutuhan calon jemaah (Permintaan Tindak Lanjut) melalui alur tanya-jawab, dan (3) pengiriman ringkasan kebutuhan ke nomor admin untuk ditindaklanjuti (ADR-0006). Harga Indikatif (ADR-0005) dipertahankan sebagai satu-satunya jawaban faktual, dengan penegasan bahwa angka dapat berubah setelah diperiksa admin. Jawaban FAQ non-harga (ADR-0004) dinonaktifkan dari jalur runtime: pertanyaan non-harga tidak lagi dijawab dari corpus, melainkan dicatat sebagai bagian kebutuhan dan diteruskan ke admin.

## Konsekuensi

- Permintaan Tindak Lanjut menjadi alur utama setiap percakapan prospek, bukan hanya pesan yang cocok pola `FOLLOW_UP_START`. ADR-0004 tidak lagi menggambarkan perilaku runtime; entri non-harga di `src/knowledge/businessFaq.ts` menjadi sisa yang tidak terpakai dan dapat dipensiunkan pada pembersihan terpisah.
- Risiko jawaban salah konteks hilang karena bot tidak lagi menjawab di luar kisaran harga; kecepatan tanggapan dijaga oleh respons cepat, bukan kedalaman jawaban.
- Peran Gemini (ADR-0008) menyempit: pemetaan topik hanya relevan untuk Harga Indikatif. Pemakaian baru (misalnya ekstraksi bidang kebutuhan) memerlukan keputusan tersendiri.
- Dua spesifikasi sempat hidup berdampingan: spesifikasi fitur yang berlaku untuk alur percakapan kini `.scratch/lead-intake/spec.md`; `.scratch/whatsapp-customer-service-chatbot/spec.md` tetap menjadi sumber riwayat dan ketentuan yang tidak dilampaui (kanal, persetujuan, larangan data sensitif).
