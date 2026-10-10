# Handoff Sesi — 2026-10-10: fitur lead-intake tuntas (tiket 01–10), evaluasi uji coba & keputusan Gemini menyusul

> Handoff sebelumnya (2026-10-08, "siap uji coba jalankan bot, evaluasi
> menyusul") diarsipkan dalam riwayat git. Runbook Fonnte/tunnel dan
> larangan-larangannya masih berlaku; yang berubah hanya hasil pekerjaan dan
> daftar pekerjaan open.
> Analisis transkrip nyata: `.scratch/pencocokan-korpus-transkrip/analisis.md`
> (`resolved`); korpus hasilnya di `tests/korpus/transkrip-nyata.json`.

## Tujuan sesi berikutnya (satu fokus)

**Uji coba ulang bot dengan perilaku terkini (setelah tiket 06–10), kumpulkan
hasilnya apa adanya, lalu evaluasi bersama pemilik.** Hasil evaluasi inilah
yang menentukan apakah lapisan pemahaman Gemini dipasang ke runtime. Jangan
mulai perubahan perilaku baru sebelum evaluasi.

## Ringkas: apa yang terjadi sejak handoff 2026-10-08

1. **Bot pernah dijalankan di Fonnte.** Transkrip `data/transkrip-percakapan.csv`
   ada (terakhir ditulis 9 Okt). Evaluasi uji coba penuh dengan perilaku
   terkini belum dicatat — itu fokus sesi berikutnya.
2. **Analisis pencocokan transkrip nyata selesai** (`.scratch/pencocokan-korpus-transkrip/analisis.md`,
   `resolved`): 4 transkrip admin–jemaah, 423 pesan, 54 kasus korpus. Dua
   temuan utama: over-faq (pertanyaan tanpa materi justru dijawab `faq`) dan
   varian ejaan/parafrase yang lolos ke handoff.
3. **Tiket lanjutan 06–10 selesai, semuanya `resolved`:**
   - **06 regresi dialog nyata** — skenario multi-giliran, 55 kasus misfire,
     replay transkrip di `tests/regresi/`.
   - **07 handoff tanpa riwayat** — payload handoff hanya nomor + alasan +
     Ringkasan Kebutuhan (ADR-0010).
   - **08 redam over-faq** — permintaan harga spesifik, timing, include,
     kebijakan, topik tanpa materi semuanya jatuh ke handoff.
   - **09 varian ejaan & false-negative** — normalisasi `mutawwif`/`haramain`/
     `siskopatuh`, kata harga berimbuhan `-nya`, detail dokumen tanpa kata
     kunci.
   - **10 topik gap tetap handoff** (keputusan pemilik) — Raudhah/Nusuk,
     siskopatuh, asuransi, refund, vaksin, Haramain, metode pembayaran, T&C
     DP/pelunasan, perlengkapan/zam-zam, konversi SAR→IDR; pertanyaan
     non-urgent yang menjadi pesan pertama masuk intake lebih dahulu dan
     tercatat pada Ringkasan Kebutuhan, bukan handoff tanpa isi.
4. **Seluruh tiket lead-intake 01–10 kini `resolved`.** Tidak ada tiket fitur
   intake yang terbuka.
5. **Angka terkini:** `npm test` **289 lulus**; typecheck bersih; probe korpus
   118 kasus → rute tepat **109/118 (92%)**, `transkrip-nyata` 54/54,
   `topik-gap` 16/16, `varian-ejaan` 6/6, `typo` 6/6, `dasar.json` 32/41.
6. **Lapisan Gemini masih belum terpasang ke runtime.** `classifyDenganFallback`
   hanya dipakai `scripts/probe-cakupan-gemini.ts` dan tes; `handleInbound`
   masih memakai `classifyInbound` (regex).
7. **Konfigurasi aktif:** provider **Fonnte**, nomor pengembangan
   `+62 895 0700 3830`; `npm run cutover:check` masih **belum siap**
   (`production-sender-number`), nomor produksi `+62 877 4587 3159` belum
   diverifikasi di provider.
8. **Cloud API pernah diuji live** lewat nomor uji Meta `+1 555-631-6757`
   (handshake webhook + kirim keluar berhasil; lihat komentar tiket 09 lama).
   Sisa: smoke test masuk + handoff, lalu ADR provider baru. `.env` saat ini
   kembali memakai Fonnte; app Meta masih bernama `tes`.

## Sisa pemahaman yang diketahui (bukan blocker)

Probe korpus masih mencatat 9 kasus `dasar.json` yang jatuh ke handoff padahal
materinya ada, plus 1 topik meleset:

- campur-inggris: "boleh minta pricelist?", "price list nya lengkap gak?";
- parafrase harga: "kisaran biaya hotel per malam brp ya?", "budget buat nginep
  di makkah kira-kira berapa", "biaya tur kotanya gimana?";
- parafrase layanan: "yang nemenin ibadah namanya apa ya", "kendaraannya apa
  aja ya", "keliling madinah bisa dibantu?", "mau kasih sedekah lewat kalian
  bisa?";
- topik meleset: "brp hrg hotel di mekah?" terbaca `hotel-accommodation`,
  bukan `price-hotel`.

Kandidat tiket kecil berikutnya sudah diterbitkan: **tiket 11**
(`.scratch/lead-intake/issues/11-celah-pemahaman-dasar.md`, `needs-triage`) —
kelas A (pola `-nya`, "nemenin", "sedekah", "keliling", "hrg") siap
dikerjakan; kelas B (pricelist, hotel per malam, budget) butuh keputusan
pemilik karena bertabrakan dengan keputusan tercatat. Bukan alasan menahan
uji coba.

## Runbook: menjalankan bot (uji coba)

### 1. Preflight

```bash
npm test && npm run typecheck   # terakhir: 289 tes hijau, typecheck bersih
cat .env                        # pastikan WHATSAPP_PROVIDER=fonnte & token ada
```

Jangan menulis isi `.env` (token, kunci) ke berkas mana pun.

### 2. Perangkat Fonnte

Cek status perangkat di dashboard Fonnte (`https://fonnte.com`); **scan ulang
QR** bila `disconnect`. Perangkat: nomor bot `6289507003830`, paket Free,
expired 31 Oktober 2026.

### 3. Start bot + tunnel

```bash
# Terminal 1 — bot
node --env-file-if-exists=.env src/main.ts
# banner benar: "Bot WhatsApp MUTAWWIFMU siap — provider fonnte, nomor pengirim 6289507003830, port 3000"

# Terminal 2 — tunnel
cloudflared tunnel --url http://localhost:3000
```

### 4. Daftarkan webhook (WAJIB bila URL berubah)

Di dashboard Fonnte, set webhook ke:

```
https://<url-baru>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN dari .env>
```

`GET /webhook` membalas 404 di provider Fonnte — itu normal (Fonnte hanya POST).

### 5. Pemeriksaan cepat

```bash
curl http://localhost:3000/metrics
# kirim pesan dari HP lain (bukan nomor bot) → balasan masuk dalam hitungan detik
# cek data/transkrip-percakapan.csv bertambah dua baris per pesan
```

## Skenario uji coba (dari HP lain)

Jalankan berurutan, **catat hasilnya apa adanya** (screenshot/transkrip) untuk
evaluasi — jangan diperbaiki di tengah jalan:

1. **Pembukaan** — "Assalamualaikum, mau tanya land arrangement umroh" →
   balasan cepat + Menu Layanan MUTAWWIFMU.
2. **Pengumpulan** — jawab layanan → tanggal/periode → jumlah jemaah →
   kebutuhan detail → anggaran (boleh "tidak usah").
3. **Ringkasan** — Ringkasan Kebutuhan tampil per bidang, lalu minta persetujuan.
4. **Setuju** → cek di HP admin `+62 822 8388 6627`: identitas pengirim +
   Ringkasan Kebutuhan, tanpa riwayat percakapan (ADR-0010).
5. **Pembaruan** — kirim perubahan ("tambah airport handling") → ringkasan
   diperbarui → setuju → admin menerima penanda **PEMBARUAN**.
6. **Harga Indikatif** — "Berapa harga fotografer?" → jawaban dengan penegasan
   "angka dapat berubah setelah diperiksa admin".
7. **Pertanyaan topik gap sebagai pesan pertama (perilaku tiket 10)** —
   mulai percakapan baru dengan "berapa biaya siskopatuhnya?" → bot **tidak**
   langsung meminta persetujuan handoff; pesannya dicatat, pengumpulan
   kebutuhan berlanjut, dan pertanyaannya muncul di Ringkasan Kebutuhan admin.
8. **Over-faq (perilaku tiket 08/09)** — "kalo upgrade ke staria tambahannya
   brp?" dan "muthowif itu biayanya berapa?" → yang pertama handoff (tidak
   dijawab), yang kedua Harga Indikatif mutawwif.
9. **Lampiran** — kirim gambar/dokumen → diakui sebagai lampiran, isinya tidak
   ditafsirkan.
10. **(opsional) Pemicu manusia** — "saya mau bicara dengan manusia" → langsung
    ke alur handoff.

## Peringatan untuk sesi baru

- **Jangan ubah perilaku percakapan sebelum evaluasi.** Keputusan pemasangan
  Gemini menunggu hasil uji coba.
- **URL tunnel berubah setiap restart** → daftarkan ulang webhook Fonnte.
- **Uji selalu dari HP lain.** `6289507003830` nomor bot; bot mengabaikan pesan
  dari nomornya sendiri.
- **Jangan jadikan Meta Cloud API provider produksi** sebelum smoke test
  masuk + handoff selesai dan keputusan provider dicatat sebagai ADR baru
  (menggantikan ADR-0003). Isu akun bisnis 131031 masih relevan.
- **Angka/harga tidak boleh digenerasi** — hanya template manual
  (`pengamanAngka.ts` menjaganya ada tes). Larangan spec, bukan selera.
- **Lapisan Gemini belum aktif di runtime.** `GEMINI_API_KEY` di `.env` hanya
  dipakai `scripts/probe-cakupan-gemini.ts`. Jangan mengira bot sudah "dibantu
  LLM" saat uji coba.
- Jangan menulis isi `.env` (token Fonnte, kunci Gemini) ke berkas handoff
  mana pun — cukup rujuk `.env`.

## Pekerjaan open (urutan yang diusulkan)

| Butir | Status |
| --- | --- |
| Uji coba ulang bot + evaluasi bersama pemilik (perilaku tiket 06–10) | **sesi berikutnya — fokus utama** |
| Keputusan pemasangan `classifyDenganFallback` (Gemini) ke runtime | menunggu evaluasi; ukur ulang `scripts/probe-cakupan-gemini.ts` vs regex 109/118 (92%) |
| Tutup celah pemahaman `dasar.json` (9 rute + 1 topik meleset) | **tiket 11** `needs-triage` — kelas A siap dikerjakan; kelas B butuh keputusan pemilik; alternatif diserahkan ke Gemini |
| Migrasi ke WhatsApp Cloud API (tiket 09 lama) | `ready-for-human`: smoke test masuk + handoff; nomor admin belum di penerima uji; ADR provider baru setelah stabil |
| Cutover nomor produksi `+62 877 4587 3159` (tiket 06 lama) | `ready-for-human`: verifikasi nomor di provider, isi `.env`, `npm run cutover:check` sampai siap, smoke test live |
| VPS + domain tetap (pengganti tunnel) | belum |
| Tiket 07 lama: adapter provider BSP sebagai fallback | `needs-info` |
| Persistent conversation store / retensi | keputusan belum diambil (README) |

## Konteks singkat (tidak berubah)

- Bahasa komunikasi & dokumentasi: **Bahasa Indonesia** (AGENTS.md).
- Runtime: Node >= 22.18, TypeScript via type stripping, **tanpa dependency
  runtime** (ADR-0002).
- Seam percakapan provider-agnostic: `src/conversation/handleInbound.ts`
  (`handleInbound(message, context): BotTurn`) — **jangan dirusak**; 289 tes
  menjaganya.
- Tiket fitur intake: `.scratch/lead-intake/` (spec + issues/01–10, semuanya
  `resolved`); spesifikasi lama `.scratch/whatsapp-customer-service-chatbot/`.
  ADR di `docs/adr/` (terbaru: ADR-0010 handoff tanpa riwayat).
- Materi bisnis: `BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`.
- `data/` di-gitignore (data pribadi: transkrip + nomor). Korpus uji di
  `tests/korpus/` sengaja ter-versioning; tambah kasus cukup lewat JSON
  (lihat `tests/korpus/README.md`).
