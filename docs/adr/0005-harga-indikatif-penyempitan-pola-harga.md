# ADR-0005: Harga Indikatif sebagai jalur jawaban tersendiri dengan penyempitan pola harga/ketersediaan

Status: accepted

## Konteks

Tiket 05 (spec: Harga Indikatif) mensyaratkan bot dapat menyebut angka harga yang tercantum materi sebagai Harga Indikatif, dengan peringatan bila satuan, periode, atau ketentuannya belum terverifikasi (materi hotel bahkan memuat keterangan satuan yang bertentangan: per orang di sampul, per kamar di tabel). ADR-0004 memutuskan pencocokan aturan di `src/knowledge/businessFaq.ts` dan klasifikasi `faq`/`handoff`/`opener` di `src/conversation/classifyInbound.ts`, dengan pola harga/ketersediaan yang **selalu** meneruskan pertanyaan harga ke alur handoff tiket 02. Konsekuensi ADR-0004 bahkan mengasumsikan tiket 05 "menambah atau mengubah entri pada modul pengetahuan yang sama tanpa menyentuh logika klasifikasi" — asumsi itu tidak bertahan: pertanyaan angka harga yang tercantum materi tidak boleh lagi selalu ke admin.

## Keputusan

Bertentangan dengan asumsi konsekuensi ADR-0004 (perubahan klasifikasi dilakukan secara sadar, tidak diam-diam), tiket 05 memperluas model sebagai berikut:

- `src/knowledge/businessFaq.ts` memuat entri **topik Harga Indikatif** (`PriceTopic`, nilai `price-*`) yang jawabannya hanya mengutip angka materi beserta peringatan: penyebutan eksplisit "Harga Indikatif", larangan klaim harga final, pernyataan konflik satuan materi untuk harga hotel, dan penolakan menafsirkan satuan yang tidak tercantum materi. Topik harga didahulukan atas topik layanan generik dalam urutan entri agar "Berapa harga fotografer?" tidak jatuh ke `photographer-videographer`.
- `classifyInbound.ts` menambah hasil klasifikasi `indicative-price` (di luar `faq`/`handoff`/`opener`), dan **menyempitkan** pola `custom-quote-or-availability` menjadi dua: pola permintaan penawaran/konfirmasi harga/ketersediaan yang tetap selalu ke admin, dan pola sisa pertanyaan harga (angka tidak tercantum materi, mis. "harga paket umrah") yang diperiksa **setelah** pencocokan topik Harga Indikatif. Pesan yang memuat satuan yang tidak tercantum materi (mis. "per malam") tidak ditafsirkan dan diteruskan ke admin.
- Pertanyaan yang memuat rincian yang tidak didukung materi tetap ke handoff lebih dahulu, sehingga pertanyaan harga yang disertai rincian tak didukung tidak dijawab sebagian dari asumsi.

## Konsekuensi

- Satu sumber klasifikasi tetap `classifyInbound.ts`; `handleInbound.ts` hanya membedakan balasan `faq` dan `indicative-price` yang keduanya mencatat `record-faq-answer` (topik `price-*` ikut terhitung metrik `faqAnswered` — wiring metrik generik tidak berubah).
- Konsekuensi ADR-0004 yang tersisa tetap berlaku: teks jawaban disusun manual dari materi dan dites groundedness-nya; batas pola berarti parafrase yang tidak dikenal jatuh ke handoff, bukan ke jawaban yang salah.
- Bila materi harga diperbarui (mis. konflik satuan hotel diselesaikan), entri topik harga yang bersangkutan diperbarui; angka yang tidak tercantum materi tetap tidak boleh ditambahkan.
