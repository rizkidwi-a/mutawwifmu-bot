# 01: Pertanyaan menyela dengan kata kunci "ingin bertanya"

**What to build:** Detektor niat bertanya untuk pesan yang menyela pengumpulan:
kata kunci "ingin bertanya", "ada yang ingin ditanyakan", serta varian yang
disepakati ("mau bertanya", "ingin menanyakan", "ingin tanya", "mau nanya", EN:
"want to ask", "have a question") — dengan pengecualian frasa negasi ("tidak
ada yang ingin ditanyakan", "tidak ingin bertanya"). Saat bot sedang
mengajukan pertanyaan atau menunggu konfirmasi (state `collecting`,
`awaiting-consent`, `awaiting-revision-consent`, `sent`), pesannya tidak boleh
mengisi bidang mana pun: isinya disimpan apa adanya ke Bagian Pertanyaan
(`notedQuestions`), dibalas kira-kira "Baik, akan saya simpan di bagian
pertanyaan dan nanti dikonfirmasi admin." (versi EN setara), lalu dilanjutkan
prompt yang tertunda (bidang yang sedang ditanya atau permintaan konfirmasi)
pola `balasanDenganPrompt`. State alur tidak berubah. Pesan pertama percakapan
pembuka ("Halo, saya ingin bertanya tentang umrah") tetap membuka pengumpulan
seperti sekarang — jangan diubah.

Catatan implementasi (usulan, tidak mengikat):
- Detektor baru murni di `src/conversation/` (mis. `penyelaPengumpulan.ts`)
  yang dipakai `handleInbound` (`nextState` + `step`); `classifyInbound` dan
  korpus eval tidak perlu diubah.
- Prioritas: pemicu mendesak (URGENT_TRIGGERS) > perbaikan bidang (tiket 02,
  bila sudah ada) > pertanyaan menyela > perilaku lama.
- Teks balasan mengikuti keputusan terbuka spec (kata kunci polos vs dengan isi
  pertanyaan).

**Blocked by:** —

**Status:** resolved

- [x] Keputusan terbuka spec nomor 1–4 dikonfirmasi pemilik.
- [x] Pesan berkata kunci saat pengumpulan tidak pernah mengisi bidang; isinya
      muncul sebagai "Pertanyaan yang dicatat" pada Ringkasan Kebutuhan.
- [x] Balasan memuat pengakuan "bagian pertanyaan" + "dikonfirmasi admin"
      (ID/EN) dan mengulang prompt yang tertunda.
- [x] Frasa negasi tidak memicu perilaku ini.
- [x] Pesan pembuka pertama tetap membuka pengumpulan (regresi
      `intakeSebagaiAlurUtama.test.ts`, `handleInbound.test.ts`).
- [x] State alur setelah pesan menyela identik dengan sebelumnya (pengumpulan /
      konfirmasi berlanjut tanpa reset).
- [x] Tes baru di `tests/conversation/` (`pertanyaanMenyela.test.ts`) mencakup
      kasus ID + EN, negasi, dan kasus "ada yang ingin ditanyakan" yang saat
      ini salah jadi jawaban bidang.
- [x] `npm test` dan `npm run typecheck` hijau.

## Comments

### Implementasi (sesi 2026-10-10)

Detektor di `src/conversation/penyelaPengumpulan.ts` (`deteksiPenyela`), state
baru `awaiting-question` di `FlowState` untuk kata kunci polos, balasan
`PERTANYAAN_MENYELA_ID/EN` dan `MINTA_PERTANYAAN_ID/EN` di `handleInbound`.
Prioritas akhir (disepekati saat implementasi, spec sudah diperbarui): pemicu
mendesak > pertanyaan menyela > perbaikan bidang — "ingin bertanya, bisa hapus
bagian tanggal?" adalah pertanyaan, bukan perintah. Pertanyaan Harga Indikatif
dikecualikan dari penyelaan agar jawaban materi tetap berlaku. Untuk kata kunci
polos, balasan "bagian pertanyaan ... dikonfirmasi admin" diberikan saat isi
pertanyaannya tiba (pesan berikutnya); balasan pertamanya meminta isinya.
