# 04: Jawab FAQ layanan lain dalam profil

**What to build:** Calon jemaah dapat menanyakan layanan lain dalam profil MUTAWWIFMU dan menerima jawaban berbasis materi melalui percakapan WhatsApp yang sama.

**Blocked by:** 03: Jawab FAQ Private Premium Umrah

**Status:** resolved

- [x] Bot menjawab pertanyaan yang didukung materi tentang tour guide di berbagai negara, charity program, dukungan multibahasa, fotografer/videografer, dan custom itinerary.
- [x] Pertanyaan tentang layanan lain dari profil juga dijawab dalam Bahasa Indonesia atau Inggris mengikuti bahasa calon jemaah.
- [x] Bot tidak menjanjikan ketersediaan layanan, destinasi, atau rincian yang tidak dicantumkan dalam materi.
- [x] Pertanyaan dari agen travel dan korporasi/institusi diteruskan ke admin, bukan diproses sebagai permintaan calon jemaah langsung.
- [x] Informasi yang tidak tersedia atau tidak pasti menggunakan alur handoff pada tiket 02.

## Comments

### Implementasi selesai — tiket resolved (agent)

Layanan lain dalam profil dijawab sebagai entri FAQ pada basis pengetahuan yang sama dengan tiket 03 (ADR-0004); logika klasifikasi tidak berubah.

- Modul pengetahuan berganti nama `src/knowledge/privatePremiumUmrahFaq.ts` → `src/knowledge/businessFaq.ts` (tipe `UmrahFaqTopic` → `FaqTopic`) karena cakupannya kini seluruh materi bisnis, bukan hanya Private Premium Umrah. Entri baru: `tour-guide`, `charity-program`, `multi-language-support`, `photographer-videographer`, `custom-itinerary`, seluruhnya disusun hanya dari `BOOKLET MUTAWWIFMU.md`.
- Pengaturan urutan entri penting: `tour-guide` didahulukan atas city tour per destinasi (pola kata "guide" lebih spesifik daripada "tour"), dan `multi-language-support` diletakkan setelah `mutawwif` agar "Do you provide bilingual worship guides?" tetap terjawab sebagai mutawwif.
- Semua jawaban baru tanpa angka harga, tanpa klaim ketersediaan, dan tanpa menyebut destinasi tertentu yang tidak dicantumkan materi; pertanyaan destinasi spesifik (mis. "tour guide ke Jepang") dijawab dengan fakta jaringan 190 negara dilanjutkan ajakan konfirmasi ke tim.
- Tes: `tests/knowledge/businessFaq.test.ts` (fakta materi + larangan menjanjikan ketersediaan/mengarang destinasi) dan `tests/conversation/otherProfileServicesFaq.test.ts` (perilaku pada seam `handleInbound`: jawaban per topik ID/EN, tanpa handoff, agen/korporasi → `agency-or-corporate` tanpa Permintaan Tindak Lanjut, informasi tak tersedia → `unsupported-question` via alur tiket 02, pertanyaan harga layanan lain tetap ke `custom-quote-or-availability`).
- README bagian "FAQ layanan" diperbarui.

Catatan untuk tiket 05: pertanyaan harga saat ini selalu ke alur handoff (termasuk "Berapa harga fotografer?") dan tes `otherProfileServicesFaq.test.ts` menjaga perilaku itu; tiket 05 perlu mengubah batasan tersebut secara sadar (angka harga materi boleh disebut sebagai Harga Indikatif) beserta asersi tes "tanpa angka harga" di `businessFaq.test.ts`.
