# ADR-0004: Jawaban FAQ dari basis pengetahuan materi dengan pencocokan aturan

Status: accepted

## Konteks

Spec menetapkan bahwa bot hanya boleh menjawab berdasarkan materi bisnis yang tersedia dan tidak boleh mengarang rincian paket, layanan, atau ketentuan. Tiket 03 menjawab FAQ Private Premium Umrah & Land Arrangement dalam Bahasa Indonesia atau Inggris, sementara pertanyaan yang tidak didukung materi atau memerlukan konfirmasi harus diteruskan ke alur admin (tiket 02). ADR-0002 memilih runtime tanpa dependency runtime, sehingga tidak ada komponen LLM atau layanan AI yang dapat dipakai — dan jawaban generatif justru berisiko mengarang fakta.

## Keputusan

Jawaban FAQ disusun **manual dari materi bisnis** (`BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`) dan disimpan sebagai basis pengetahuan di `src/knowledge/`, lalu dipilih melalui **pencocokan aturan (pola kata)** pada pesan masuk:

- `src/knowledge/privatePremiumUmrahFaq.ts` memuat entri FAQ: topik, pola pencocok, dan jawaban dwibahasa (ID/EN) yang hanya berisi fakta materi. Tidak ada teks jawaban yang dihasilkan saat runtime.
- `src/conversation/classifyInbound.ts` mengklasifikasikan pesan ke `faq`, `handoff` (dengan alasan yang sama dengan `HandOffReason`), atau `opener`. Pemicu handoff (harga/ketersediaan, booking/pembayaran, permintaan manusia, agen/korporasi, perjalanan aktif/darurat, rincian tak didukung) **diperiksa sebelum** pencocokan FAQ, sehingga pertanyaan yang memerlukan konfirmasi tidak pernah dijawab sebagai penawaran final.
- Pesan yang tidak cocok dengan topik mana pun tidak dijawab dari asumsi: pertanyaan eksplisit diteruskan ke alur handoff tiket 02, sapaan/pembuka memperoleh balasan awal.
- Bahasa balasan mengikuti bahasa Calon Jemaah (`src/conversation/language.ts`).

## Konsekuensi

- Jawaban tidak dapat mengarang fakta baru karena teksnya disusun dan ditinjau dari materi; tes memeriksa groundedness jawaban (tanpa angka harga final, tanpa durasi paket, tanpa klaim di luar materi).
- Pencocokan aturan memiliki batas: parafrase atau pertanyaan ambigu mungkin tidak dikenali. Konsekuensinya aman — pesan tersebut jatuh ke alur handoff, bukan ke jawaban yang salah.
- Pembaruan materi bisnis berarti memperbarui basis pengetahuan; tiket 04 (layanan lain) dan tiket 05 (harga indikatif) menambah atau mengubah entri pada modul pengetahuan yang sama tanpa menyentuh logika klasifikasi.
- Bila kelak jawaban generatif dipertimbangkan, keputusan itu wajib dicatat ADR baru dan harus tetap memenuhi larangan mengarang fakta dari spec.
