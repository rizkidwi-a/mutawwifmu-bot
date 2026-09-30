# 03: Jawab FAQ Private Premium Umrah

**What to build:** Calon jemaah mendapat jawaban pra-pemesanan tentang Private Premium Umrah dan Land Arrangement dalam Bahasa Indonesia atau Inggris, menggunakan materi bisnis yang tersedia.

**Blocked by:** 01: Sambungkan WhatsApp melalui nomor pengembangan; 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan

**Status:** resolved

- [x] Bot menjawab pertanyaan yang didukung materi mengenai Private Premium Umrah dan kebutuhan darat terkait, termasuk mutawwif, visa/dokumen, hotel/akomodasi, transportasi/armada, airport handling, dan city tour yang tercantum.
- [x] Bot membalas dalam bahasa yang digunakan calon jemaah: Bahasa Indonesia atau Inggris.
- [x] Bot menggunakan hanya fakta dari materi MUTAWWIFMU dan tidak mengarang rincian paket, layanan, atau ketentuan.
- [x] Pertanyaan harga/ketersediaan yang memerlukan konfirmasi tidak dijawab sebagai penawaran final; gunakan alur handoff yang tersedia.
- [x] Pertanyaan yang tidak didukung materi atau tidak pasti diteruskan ke alur admin pada tiket 02.
- [x] Bot tidak menyelesaikan booking atau pembayaran melalui percakapan.
- [x] FAQ yang terjawab tanpa handoff dapat dihitung sebagai metrik pendamping keberhasilan.

## Comments

### Progres implementasi (agent)

Bagian yang tidak bergantung tiket 02 sudah selesai dan diuji hijau:

- `src/knowledge/privatePremiumUmrahFaq.ts` — jawaban FAQ dwibahasa (ID/EN) untuk Private Premium Umrah & Land Arrangement: definisi layanan, mutawwif, visa/dokumen, hotel/akomodasi, transportasi/armada, airport handling, dan city tour (umum + Makkah/Madinah/Thaif/Al Ula). Seluruhnya disusun hanya dari `BOOKLET MUTAWWIFMU.md` dan `HOTEL RATES MUTAWWIFMU (2).md`.
- `src/conversation/classifyInbound.ts` — klasifikasi `faq` / `handoff` / `opener`; pemicu handoff (harga/ketersediaan, booking/pembayaran, permintaan manusia, agen/korporasi, perjalanan aktif, darurat, rincian tak didukung) diperiksa sebelum pencocokan FAQ sehingga pertanyaan yang memerlukan konfirmasi tidak dijawab sebagai penawaran final. Label `trigger` selaras `HandOffReason` di `types.ts`.
- `src/conversation/language.ts` — deteksi bahasa Calon Jemaah.
- Tes: `tests/knowledge/privatePremiumUmrahFaq.test.ts` (groundedness jawaban + pencocokan topik) dan `tests/conversation/classifyInbound.test.ts` (routing).
- ADR-0004 (`docs/adr/0004-faq-materi-pencocokan-aturan.md`) mencatat keputusan jawaban FAQ berbasis materi dengan pencocokan aturan.

Sisa pekerjaan menunggu tiket 02: integrasi ke seam `handleInbound` (jawaban FAQ + routing ke alur handoff yang tersedia), tes perilaku pada seam, serta metrik "FAQ terjawab tanpa handoff".

### Integrasi ke seam selesai — tiket resolved (agent)

Integrasi tiket 03 ke seam setelah tiket 02 selesai:

- `src/conversation/handleInbound.ts` — pertanyaan ber-routing `faq` dijawab `faqAnswer(topic, language)` dengan tindakan terlihat `record-faq-answer`; klasifikasi pesan masuk kini satu sumber melalui `classifyInbound` (detektor privat lama dihapus). Urutan state tetap: resolusi persetujuan → pemicu mendesak yang menyela (termasuk saat pengumpulan) → isi bidang pengumpulan (klasifikasi diabaikan agar jawaban bidang tidak salah jadi pemicu/FAQ) → tunggu persetujuan → routing handoff → Permintaan Tindak Lanjut → FAQ/sapaan.
- `src/conversation/types.ts` — varian tindakan `record-faq-answer` (`topic` berisi topik materi yang dijawab).
- `src/conversation/language.ts` — `resolveReplyLanguage(history, text)` memuat deteksi bahasa balasan (penanda lebar + fallback bahasa percakapan dari riwayat); `detectLanguage` tetap diekspor.
- `src/metrics.ts` + `src/server.ts` — metrik pendamping `faqAnswered` (`recordFaqAnswer()`) untuk "FAQ terjawab tanpa handoff"; `runActions` mencatatnya tanpa meneruskan apa pun ke kanal admin.
- Tes: `tests/conversation/faqAnswer.test.ts` (jawaban FAQ per topik pada seam, jawaban EN, pertanyaan harga/ketersediaan → persetujuan handoff tanpa angka harga, tanpa janji transaksi) dan `tests/transport/handOffDelivery.test.ts` (FAQ via webhook → `faqAnswered: 1`, tanpa handoff).
- README: bagian "FAQ layanan".

Catatan keputusan: pertanyaan berbentuk ketersediaan seperti "Apakah tersedia city tour?" tidak dijawab sebagai FAQ meski `matchFaqTopic` cocok — kata "tersedia" membuatnya menjadi pertanyaan ketersediaan yang perlu konfirmasi admin (routing `custom-quote-or-availability`), sejajar dengan pertanyaan harga "Berapa harga hotel di Mekkah?". Pencocokan FAQ di level knowledge tidak boleh dipakai tanpa cek pola handoff lebih dulu.
