# ADR-0002: Runtime Node.js + TypeScript tanpa dependency runtime

Status: accepted

## Konteks

Spec menyatakan framework aplikasi belum diputuskan dan tidak boleh diasumsikan. Tiket 01 membutuhkan proses yang berjalan setiap saat untuk menerima webhook WhatsApp dan membalas pesan, serta tes transport dan tes perilaku pada seam percakapan yang disepakati.

## Keputusan

Gunakan **Node.js (>= 22.18) dengan TypeScript dijalankan langsung via type stripping**, tanpa dependency runtime:

- HTTP server: `node:http`.
- Kriptografi (HMAC tanda tangan webhook): `node:crypto`.
- Panggilan API provider: `fetch` global.
- Tes: `node:test` + `node:assert/strict`; typecheck: `tsc --noEmit`.
- Struktur kode: `src/conversation/` (seam provider-agnostic), `src/adapters/whatsapp-cloud/` (transport provider), `src/config.ts`, `src/server.ts`, `src/main.ts`.

## Konsekuensi

- Tidak ada kenyamanan framework (routing, middleware); cukup untuk satu endpoint webhook saat ini.
- `npm test` menjalankan seluruh tes tanpa konfigurasi runner tambahan; `npm run typecheck` untuk pemeriksaan tipe.
- Bila kelak membutuhkan framework (mis. untuk kanal admin atau penyimpanan percakapan), keputusan itu harus dicatat ADR baru dan tidak boleh merusak seam `handleInbound` yang sudah diuji.
