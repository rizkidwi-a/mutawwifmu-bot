# ADR-0008: Pemaham bahasa LLM Gemini hibrida — fakta tetap manual

Status: accepted

## Konteks

Baseline terukur (`node scripts/probe-cakupan.ts`, 41 kasus): pertanyaan materi
terjawab 24/33 (73%). Pola tajam — baku 100%, parafrase 64%, campur-Inggris 33%.
Batas ini adalah lantai atas pencocokan aturan (ADR-0004), bukan kurang pola.
Pemilik memutuskan: *"yang penting bagi saya adalah bot cukup leluasa untuk
memahami bahasa Indonesia"* (gaul/typo/parafrase).

ADR-0004 melarang jawaban generatif karena risiko mengarang fakta, dan mewajibkan:
*"Bila kelak jawaban generatif dipertimbangkan, keputusan itu wajib dicatat ADR
baru"*. ADR ini adalah catatan itu. Spec baris 92 memasukkan *"mengarang
informasi tentang harga"* sebagai di luar cakupan/dilarang — satu angka karangan
= satu masalah nyata dengan calon jemaah.

## Keputusan

Hibrida, sesuai riset `.scratch/.../riset-pencocokan-samar.md` (aturan vs model):

- Pemahaman bahasa → **LLM Gemini** (`src/knowledge/geminiPemaham.ts`, `fetch`
  global bawaan Node, nol dependency baru sesuai ADR-0002). Hasil terstruktur
  `{ rute, topik, keyakinan }` — LLM hanya memilih *topik*, tidak pernah menulis
  kalimat jawaban.
- Fakta & jawaban → **tetap dari template manual** `faqAnswer()` yang ditinjau
  dari materi. Angka & harga **HANYA** dari template; LLM dilarang menyentuh angka.
- Saat ragu → **handoff ke admin** (jalur tiket 02 selalu tersedia).

Empat lapis pengaman (bagian keputusan, bukan catatan kaki):

1. Angka tak pernah digenerasi — jawaban selalu `faqAnswer(topik)`.
2. Validasi grounding (`src/knowledge/pengamanAngka.ts`) — setiap angka di
   jawaban harus verbatim ada di materi; bila tidak → fallback handoff.
3. Ambang keyakinan 0,6 — di bawah itu abaikan LLM, pakai jalur aturan.
4. Fallback ke regex — bila Gemini error/timeout/kunci hilang, turun ke
   `classifyInbound()` lama. Bot tidak boleh diam hanya karena LLM mati.

## Konsekuensi

- `classifyInbound()` sync tetap ada dan tetap jadi fallback + baseline 73%.
  Jalur baru `classifyDenganFallback()` async membungkusnya (langkah 4).
- `handleInbound()` sync tidak diubah — tidak merusak 177 tes yang menjaganya.
  Wiring async ke server menyusul setelah angka pengukuran bagus.
- Ukur ulang dengan `node scripts/probe-cakupan.ts` (regex) vs jalur Gemini;
  jangan klaim naik tanpa angka.
- Kunci `GEMINI_API_KEY` hanya di `.env`, tidak pernah ditulis ke berkas mana pun.

Catatan 2026-10-08: model default `gemini-2.5-flash` pensiun (404 untuk user baru); diganti `gemini-3.8-flash` yang terverifikasi 200.
