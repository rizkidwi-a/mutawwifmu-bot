/**
 * Klasifikator pesan masuk dengan pemaham Gemini opsional (tiket 01).
 * Seluruh tes memakai fetch tiruan — tidak ada panggilan jaringan nyata.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buatKlasifikatorPesan } from "../../src/conversation/klasifikasiMasuk.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";

const KONFIG = { apiKey: "kunci-tes", model: "model-tes" };

function responsGemini(teksJson: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: teksJson }] } }],
    }),
  } as unknown as Response;
}

/** Fetch tiruan yang menghitung panggilan dan mengembalikan respons berurutan. */
function fetchPencatat(
  ...respons: ReadonlyArray<(init?: RequestInit) => Promise<Response>>
) {
  const panggilan: string[] = [];
  const fetchFn = (async (url: unknown, init?: RequestInit) => {
    panggilan.push(String(url));
    const hasil = respons[Math.min(panggilan.length - 1, respons.length - 1)];
    if (hasil === undefined) throw new Error("fetch tidak boleh dipanggil");
    return hasil(init);
  }) as typeof fetch;
  return { fetchFn, panggilan };
}

const TEKS_TANYA_HARGA = "yang di makkah semalamnya berapa ya";
const TEKS_TANYA_LAYANAN = "yang jagain jamaah selama ibadah namanya apa ya";

test("tanpa kunci Gemini: hasil regex, tanpa request jaringan sama sekali", async () => {
  const { fetchFn, panggilan } = fetchPencatat();
  const klasifikasi = buatKlasifikatorPesan(null, { fetchFn });
  const hasil = await klasifikasi(TEKS_TANYA_HARGA);
  assert.deepEqual(hasil, classifyInbound(TEKS_TANYA_HARGA));
  assert.deepEqual(panggilan, [], "tanpa kunci tidak boleh ada request jaringan");
});

test("pesan kosong tidak dikirim ke Gemini", async () => {
  const { fetchFn, panggilan } = fetchPencatat(async () => responsGemini("{}"));
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn });
  const hasil = await klasifikasi("   ");
  assert.deepEqual(hasil, classifyInbound(""));
  assert.deepEqual(panggilan, []);
});

test("respons valid dipakai dengan paling banyak satu request", async () => {
  const { fetchFn, panggilan } = fetchPencatat(async () =>
    responsGemini('{"rute":"indicative-price","topik":"price-hotel","keyakinan":0.85}'),
  );
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn });
  const hasil = await klasifikasi(TEKS_TANYA_HARGA);
  assert.deepEqual(hasil, { kind: "indicative-price", topic: "price-hotel" });
  assert.equal(panggilan.length, 1, "satu pesan = satu request Gemini");
});

test("kegagalan jaringan/HTTP/JSON/rute/topik jatuh ke hasil regex", async () => {
  const kasus: ReadonlyArray<{ nama: string; respons: () => Promise<Response> }> = [
    {
      nama: "jaringan putus",
      respons: async () => {
        throw new Error("jaringan putus");
      },
    },
    { nama: "HTTP 500", respons: async () => ({ ok: false, status: 500 }) as unknown as Response },
    { nama: "bukan JSON", respons: async () => responsGemini("bukan json sama sekali") },
    { nama: "rute tak dikenal", respons: async () => responsGemini('{"rute":"ngawur","keyakinan":0.9}') },
    {
      nama: "topik tak valid",
      respons: async () => responsGemini('{"rute":"faq","topik":"topik-karangan","keyakinan":0.9}'),
    },
    { nama: "topik hilang", respons: async () => responsGemini('{"rute":"faq","keyakinan":0.9}') },
  ];
  for (const { nama, respons } of kasus) {
    const { fetchFn } = fetchPencatat(respons);
    const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn });
    const hasil = await klasifikasi(TEKS_TANYA_LAYANAN);
    assert.deepEqual(hasil, classifyInbound(TEKS_TANYA_LAYANAN), nama);
  }
});

test("keyakinan rendah diabaikan, hasil regex yang dipakai", async () => {
  const { fetchFn } = fetchPencatat(async () =>
    responsGemini('{"rute":"faq","topik":"transport-fleet","keyakinan":0.2}'),
  );
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn });
  const hasil = await klasifikasi(TEKS_TANYA_LAYANAN);
  assert.deepEqual(hasil, classifyInbound(TEKS_TANYA_LAYANAN));
});

test("timeout pemahaman (fetch tidak pernah selesai) jatuh ke hasil regex", async () => {
  // Fetch menolak saat sinyal abort menyala; tiga percobaan habis semua,
  // hasil regex tetap keluar tanpa menunggu jaringan.
  const { fetchFn } = fetchPencatat(
    (init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("dibatalkan tenggat")));
      }),
  );
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn, timeoutMs: 20, tenggatMs: 5000 });
  const hasil = await klasifikasi(TEKS_TANYA_LAYANAN);
  assert.deepEqual(hasil, classifyInbound(TEKS_TANYA_LAYANAN));
});

test("tenggat pemahaman habis: segera jatuh ke regex, hasil model tidak dipakai", async () => {
  // Respons model datang terlambat (150 ms) melewati tenggat (20 ms).
  const { fetchFn, panggilan } = fetchPencatat(
    () =>
      new Promise<Response>((resolve) => {
        setTimeout(() => resolve(responsGemini('{"rute":"faq","topik":"mutawwif","keyakinan":0.9}')), 150);
      }),
  );
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn, timeoutMs: 5000, tenggatMs: 20 });
  const hasil = await klasifikasi(TEKS_TANYA_LAYANAN);
  assert.deepEqual(hasil, classifyInbound(TEKS_TANYA_LAYANAN));
  assert.equal(panggilan.length, 1);
});

test("pemicu berisiko dari regex tetap menang walau model menjawab faq", async () => {
  const { fetchFn } = fetchPencatat(async () =>
    responsGemini('{"rute":"faq","topik":"transport-fleet","keyakinan":0.95}'),
  );
  const klasifikasi = buatKlasifikatorPesan(KONFIG, { fetchFn });
  const hasil = await klasifikasi("mau bayar DP untuk 4 orang");
  assert.deepEqual(hasil, { kind: "handoff", trigger: "booking-or-payment" });
});
