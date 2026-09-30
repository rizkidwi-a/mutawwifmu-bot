# 03: Jawab FAQ Private Premium Umrah

**What to build:** Calon jemaah mendapat jawaban pra-pemesanan tentang Private Premium Umrah dan Land Arrangement dalam Bahasa Indonesia atau Inggris, menggunakan materi bisnis yang tersedia.

**Blocked by:** 01: Sambungkan WhatsApp melalui nomor pengembangan; 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan

**Status:** ready-for-agent

- [ ] Bot menjawab pertanyaan yang didukung materi mengenai Private Premium Umrah dan kebutuhan darat terkait, termasuk mutawwif, visa/dokumen, hotel/akomodasi, transportasi/armada, airport handling, dan city tour yang tercantum.
- [ ] Bot membalas dalam bahasa yang digunakan calon jemaah: Bahasa Indonesia atau Inggris.
- [ ] Bot menggunakan hanya fakta dari materi MUTAWWIFMU dan tidak mengarang rincian paket, layanan, atau ketentuan.
- [ ] Pertanyaan harga/ketersediaan yang memerlukan konfirmasi tidak dijawab sebagai penawaran final; gunakan alur handoff yang tersedia.
- [ ] Pertanyaan yang tidak didukung materi atau tidak pasti diteruskan ke alur admin pada tiket 02.
- [ ] Bot tidak menyelesaikan booking atau pembayaran melalui percakapan.
- [ ] FAQ yang terjawab tanpa handoff dapat dihitung sebagai metrik pendamping keberhasilan.

## Comments

### Progres implementasi (agent)

Bagian yang tidak bergantung tiket 02 sudah selesai dan diuji hijau:

- `src/knowledge/privatePremiumUmrahFaq.ts` — jawaban FAQ dwibahasa (ID/EN) untuk Private Premium Umrah & Land Arrangement: definisi layanan, mutawwif, visa/dokumen, hotel/akomodasi, transportasi/armada, airport handling, dan city tour (umum + Makkah/Madinah/Thaif/Al Ula). Seluruhnya disusun hanya dari `BOOKLET MUTAWWIFMU.md` dan `HOTEL RATES MUTAWWIFMU (2).md`.
- `src/conversation/classifyInbound.ts` — klasifikasi `faq` / `handoff` / `opener`; pemicu handoff (harga/ketersediaan, booking/pembayaran, permintaan manusia, agen/korporasi, perjalanan aktif, darurat, rincian tak didukung) diperiksa sebelum pencocokan FAQ sehingga pertanyaan yang memerlukan konfirmasi tidak dijawab sebagai penawaran final. Label `trigger` selaras `HandOffReason` di `types.ts`.
- `src/conversation/language.ts` — deteksi bahasa Calon Jemaah.
- Tes: `tests/knowledge/privatePremiumUmrahFaq.test.ts` (groundedness jawaban + pencocokan topik) dan `tests/conversation/classifyInbound.test.ts` (routing).
- ADR-0004 (`docs/adr/0004-faq-materi-pencocokan-aturan.md`) mencatat keputusan jawaban FAQ berbasis materi dengan pencocokan aturan.

Sisa pekerjaan menunggu tiket 02: integrasi ke seam `handleInbound` (jawaban FAQ + routing ke alur handoff yang tersedia), tes perilaku pada seam, serta metrik "FAQ terjawab tanpa handoff".
