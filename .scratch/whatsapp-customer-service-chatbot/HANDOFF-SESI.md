# Handoff Sesi — 2026-10-08: siap uji coba jalankan bot, evaluasi menyusul

> Handoff sebelumnya (2026-10-07) diarsipkan dalam riwayat git, judulnya
> "bot hidup di Fonnte + keputusan lapisan pemaham LLM". Isinya masih berlaku
> untuk latar belakang (131031 Meta, Fonnte, baseline 73%).

## Tujuan sesi berikutnya (satu fokus)

**Jalankan bot untuk uji coba nyata**, kumpulkan hasilnya apa adanya, lalu
**evaluasi bersama pemilik** — baru lanjut ke implementasi (tiket 06 regresi,
pemasangan lapisan pemaham Gemini ke runtime). Jangan mulai perubahan perilaku
sebelum evaluasi.

## Ringkas: apa yang terjadi sejak handoff terakhir

1. **Fitur lead-intake selesai (tiket 01–05, spec `.scratch/lead-intake/spec.md`,
   ADR-0009).** Bot kini berpusat pada Permintaan Tindak Lanjut: respons cepat →
   menu Layanan → kumpul bidang (layanan, tanggal/periode, jumlah jemaah,
   kebutuhan detail, anggaran opsional) → Ringkasan Kebutuhan per bidang →
   persetujuan → pesan ke admin. FAQ non-harga tidak dijawab dari materi
   (dicatat sebagai kebutuhan); hanya Harga Indikatif yang dijawab, selalu
   dengan penegasan "angka dapat berubah setelah diperiksa admin". Setelah
   ringkasan terkirim, perubahan kebutuhan dikirim ulang berpenanda
   "PEMBARUAN" dengan persetujuan baru.
2. **Lapisan pemaham Gemini selesai dibuat dan kini ter-commit** (ADR-0008,
   commit `5b29068`): `geminiPemaham.ts` + `pengamanAngka.ts` +
   `classifyDenganFallback.ts` + `scripts/probe-cakupan-gemini.ts` + tes.
   **Belum terpasang ke runtime** — `handleInbound` masih memakai
   `classifyInbound` (regex). Bot yang dijalankan nanti = perilaku lead-intake
   dengan pemahaman regex. Pemasangan menyusul setelah evaluasi.
3. **Riset pengganti WhatsApp API** ter-commit (`a5e2ff0`) — masih "belum
   keputusan"; jangan diubah sebelum pemilik memilih.
4. **Tiket 06 (regresi dialog `data/chat.md`) tetap `ready-for-agent`.**
   Analisis awal sudah dicatat di komentar tiket itu (hasil probe 55 kasus
   misfire) — baca sebelum mengimplementasikan.

## Temuan analisis yang menunggu evaluasi (ringkas)

Probe 55 kasus `.scratch/eval-classify.txt` lewat seam `handleInbound`:

- ✅ Tidak ada lagi balasan dari topik FAQ non-harga (ADR-0009 menutup kelas
  misfire itu).
- ❌ Satu misfire nyata: pesan pernyataan bermuatan kata harga ("...cuma ganti
  dari harga free cancellation to non refundable...") dijawab **template Harga
  Indikatif hotel** — padahal itu informasi, bukan pertanyaan harga. Usulan:
  jawaban harga hanya untuk pesan bertanda pertanyaan.
- ❓ Dua butir keputusan: (a) basa-basi saat pengumpulan ("makasi ya kak")
  kini mengisi bidang yang sedang ditanya; (b) pertanyaan non-harga yang
  routing-nya bukan `faq` saat pengumpulan juga mengisi bidang. Keduanya
  menentukan apakah Ringkasan Kebutuhan tetap bersih saat dialog nyata
  di-replay apa adanya.

Detailnya di `.scratch/lead-intake/issues/06-regresi-dialog-chat-md.md`
bagian Comments.

## Runbook: menjalankan bot (uji coba)

### 1. Preflight

```bash
npm test && npm run typecheck   # terakhir: 239 tes hijau, typecheck bersih
cat .env                        # pastikan WHATSAPP_PROVIDER=fonnte & token ada
```

Jangan menulis isi `.env` (token, kunci) ke berkas mana pun.

### 2. Perangkat Fonnte

Terakhir tercatat `device_status: disconnect` — bot tidak bisa kirim/menerima
selama perangkat terputus. Cek status perangkat di dashboard Fonnte
(`https://fonnte.com`) dan **scan ulang QR** bila terputus. Perangkat:
nomor bot `6289507003830`, paket Free, kuota ~990, expired 31 Oktober 2026.

### 3. Start bot + tunnel

```bash
# Terminal 1 — bot (Windows: pakai Start-Process agar tahan lama)
node --env-file-if-exists=.env src/main.ts
# banner benar: "Bot WhatsApp MUTAWWIFMU siap — provider fonnte, nomor pengirim 6289507003830, port 3000"

# Terminal 2 — tunnel
cloudflared tunnel --url http://localhost:3000
# catat URL https://....trycloudflare.com
```

### 4. Daftarkan webhook (WAJIB bila URL berubah)

Quick tunnel memberi URL acak setiap restart. Di dashboard Fonnte, set webhook ke:

```
https://<url-baru>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN dari .env>
```

`GET /webhook` membalas 404 di provider Fonnte — itu normal (Fonnte hanya POST).

### 5. Pemeriksaan cepat

```bash
curl http://localhost:3000/metrics
# kirim pesan dari HP lain (bukan nomor bot) → balasan masuk dalam hitungan detik
# cek juga data/transkrip-percakapan.csv bertambah dua baris per pesan
```

## Skenario uji coba (dari HP lain, terakhir memakai `6285275258899`)

Jalankan berurutan, **catat hasilnya apa adanya** (screenshot/transkrip) untuk
evaluasi — jangan diperbaiki di tengah jalan:

1. **Pembukaan** — "Assalamualaikum, mau tanya land arrangement umroh" →
   balasan cepat + **Menu Layanan MUTAWWIFMU**.
2. **Pengumpulan** — jawab layanan → tanggal/periode → jumlah jemaah →
   kebutuhan detail (boleh sekaligus: visa per jemaah, rute, hotel mandiri/lewat
   kami) → anggaran (boleh "tidak usah").
3. **Ringkasan** — Ringkasan Kebutuhan tampil per bidang, lalu minta persetujuan.
4. **Setuju** → bot konfirmasi; **cek di HP admin `+62 822 8388 6627`**:
   pesan berisi identitas pengirim dan Ringkasan Kebutuhan, tanpa riwayat percakapan (ADR-0010).
5. **Pembaruan** — kirim perubahan ("tambah airport handling") → ringkasan
   diperbarui → setuju → admin menerima penanda **PEMBARUAN**.
6. **Harga Indikatif** — "Berapa harga fotografer?" → jawaban dengan penegasan
   "angka dapat berubah setelah diperiksa admin".
7. **Pertanyaan non-harga** — "Apa itu land arrangement?" → dicatat, tidak
   dijawab dari materi, terbawa ke ringkasan admin.
8. **Lampiran** — kirim gambar/dokumen → diakui sebagai lampiran, isinya tidak
   ditafsirkan.
9. **(opsional) Pemicu manusia** — "saya mau bicara dengan manusia" → langsung
   ke alur handoff.

## Peringatan untuk sesi baru

- **Jangan ubah perilaku percakapan sebelum evaluasi.** Tiket 06 dan pemasangan
  Gemini menunggu hasil uji coba + keputusan pemilik.
- **URL tunnel berubah setiap restart** → daftarkan ulang webhook Fonnte
  (lihat langkah 4).
- **Uji selalu dari HP lain.** `6289507003830` nomor bot; bot mengabaikan pesan
  dari nomornya sendiri.
- **Jangan kembali ke Meta Cloud API** sebelum akun bisnis tidak lagi terkunci
  (131031) dan verifikasi bisnis selesai.
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
| Uji coba jalankan bot (runbook di atas) | **sesi berikutnya — fokus utama** |
| Evaluasi hasil uji coba bersama pemilik | menyusul setelah uji coba |
| Tiket 06 regresi dialog `data/chat.md` | `ready-for-agent`; analisis awal sudah dicatat di komentar tiket |
| Pemasangan `classifyDenganFallback` ke runtime | menunggu keputusan hasil evaluasi (ukur ulang dengan `scripts/probe-cakupan-gemini.ts`, bandingkan vs 73%) |
| Keputusan basa-basi & pertanyaan non-`faq` saat pengumpulan | menunggu evaluasi (lihat "Temuan analisis") |
| Pilihan penyedia pengganti WhatsApp API | riset selesai (`a5e2ff0`), belum keputusan |
| VPS + domain tetap (pengganti tunnel, tiket 07 lama) | belum |
| Nomor produksi `+62 877 4587 3159` (tiket 06 lama) | tertunda, terkunci isu Meta |

## Konteks singkat (tidak berubah)

- Bahasa komunikasi & dokumentasi: **Bahasa Indonesia** (AGENTS.md).
- Runtime: Node >= 22.18, TypeScript via type stripping, **tanpa dependency
  runtime** (ADR-0002).
- Seam percakapan provider-agnostic: `src/conversation/handleInbound.ts`
  (`handleInbound(message, context): BotTurn`) — **jangan dirusak**, 239 tes
  menjaganya.
- Spec & tiket fitur aktif: `.scratch/lead-intake/` (spec + issues/01–06);
  spesifikasi lama `.scratch/whatsapp-customer-service-chatbot/`. ADR di
  `docs/adr/`.
- Materi bisnis: `BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`.
- `data/` di-gitignore (data pribadi: transkrip + nomor). Korpus uji di
  `tests/korpus/` sengaja ter-versioning.
