import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bacaKonfigGemini,
  pahamiDenganGemini,
} from "../../src/knowledge/geminiPemaham.ts";
import {
  AMBANG_KEYAKINAN,
  semuaAngkaAdaDiMateri,
} from "../../src/knowledge/pengamanAngka.ts";
import {
  classifyDenganFallback,
  putuskanDenganPengaman,
} from "../../src/conversation/classifyDenganFallback.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import { faqAnswer } from "../../src/knowledge/businessFaq.ts";

function responsGemini(teksJson: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: teksJson }] } }],
    }),
  } as unknown as Response;
}

// --- bacaKonfigGemini ---

test("tanpa GEMINI_API_KEY berarti LLM tidak tersedia (null)", () => {
  assert.equal(bacaKonfigGemini({}), null);
  assert.equal(bacaKonfigGemini({ GEMINI_MODEL: "gemini-2.5-flash" }), null);
});

test("GEMINI_API_KEY sudah cukup; GEMINI_MODEL opsional memakai default yang ditetapkan", () => {
  assert.deepEqual(bacaKonfigGemini({ GEMINI_API_KEY: "kunci" }), {
    apiKey: "kunci",
    model: "gemini-3.8-flash",
  });
  assert.deepEqual(
    bacaKonfigGemini({ GEMINI_API_KEY: "kunci", GEMINI_MODEL: "model-lain" }),
    { apiKey: "kunci", model: "model-lain" },
  );
});

// --- pahamiDenganGemini: semua gagal → null (sinyal fallback) ---

test("konfig null → null tanpa memanggil fetch", async () => {
  let dipanggil = false;
  const hasil = await pahamiDenganGemini(
    "halo",
    null,
    {
      fetchFn: (async () => {
        dipanggil = true;
        throw new Error("tidak boleh dipanggil");
      }) as typeof fetch,
    },
  );
  assert.equal(hasil, null);
  assert.equal(dipanggil, false);
});

test("fetch melempar (LLM mati) → null", async () => {
  const hasil = await pahamiDenganGemini(
    "berapa harga hotel?",
    { apiKey: "kunci", model: "m" },
    {
      fetchFn: (async () => {
        throw new Error("jaringan putus");
      }) as typeof fetch,
    },
  );
  assert.equal(hasil, null);
});

test("HTTP non-200 → null", async () => {
  const hasil = await pahamiDenganGemini(
    "berapa harga hotel?",
    { apiKey: "kunci", model: "m" },
    {
      fetchFn: (async () =>
        ({ ok: false, status: 500 }) as unknown as Response) as typeof fetch,
    },
  );
  assert.equal(hasil, null);
});

test("JSON tak valid / rute tak dikenal → null", async () => {
  for (const teks of ['bukan json sama sekali', '{"rute":"ngawur","keyakinan":0.9}']) {
    const hasil = await pahamiDenganGemini(
      "halo",
      { apiKey: "kunci", model: "m" },
      { fetchFn: (async () => responsGemini(teks)) as typeof fetch },
    );
    assert.equal(hasil, null, teks);
  }
});

test("respons valid diurai menjadi pemahaman terstruktur", async () => {
  const hasil = await pahamiDenganGemini(
    "boleh minta pricelist?",
    { apiKey: "kunci", model: "m" },
    {
      fetchFn: (async () =>
        responsGemini('{"rute":"faq","topik":"price-hotel","keyakinan":0.85}')) as typeof fetch,
    },
  );
  assert.deepEqual(hasil, {
    rute: "faq",
    topik: "price-hotel",
    keyakinan: 0.85,
  });
});

// --- putuskanDenganPengaman / classifyDenganFallback (langkah 4) ---

test("LLM tidak tersedia (null) → turun ke regex, bot tetap menjawab", async () => {
  const teks = "Apa itu land arrangement?";
  const hasil = await classifyDenganFallback(teks, { pemahaman: null });
  assert.deepEqual(hasil, classifyInbound(teks));
  assert.deepEqual(hasil, { kind: "faq", topic: "land-arrangement" });
});

test("pahami() melempar → tetap fallback ke regex, tidak diam", async () => {
  const hasil = await classifyDenganFallback("Apa itu land arrangement?", {
    pahami: async () => {
      throw new Error("Gemini timeout");
    },
  });
  assert.deepEqual(hasil, { kind: "faq", topic: "land-arrangement" });
});

test("keyakinan rendah (< 0,6) diabaikan, regex yang dipakai", async () => {
  const hasil = await classifyDenganFallback("Apa itu land arrangement?", {
    pemahaman: { rute: "faq", topik: "price-hotel", keyakinan: 0.2 },
  });
  assert.deepEqual(hasil, { kind: "faq", topic: "land-arrangement" });
  assert.ok(AMBANG_KEYAKINAN === 0.6);
});

test("LLM yakin + topik valid → dipakai (perbaiki yang gagal di regex)", async () => {
  // "boleh minta pricelist?" gagal di regex (jatuh handoff), Gemini menolong.
  assert.deepEqual(classifyInbound("boleh minta pricelist?").kind, "handoff");
  const hasil = await classifyDenganFallback("boleh minta pricelist?", {
    pemahaman: { rute: "faq", topik: "price-hotel", keyakinan: 0.9 },
  });
  assert.deepEqual(hasil, { kind: "faq", topic: "price-hotel" });
});

test("angka karangan tidak lolos grounding → handoff, bukan dijawab", () => {
  const jawabanKarangan = "Hotel cuma SAR 1 dan visa IDR 2 per pax.";
  assert.equal(semuaAngkaAdaDiMateri(jawabanKarangan, "materi tanpa angka itu"), false);
  // Template asli lolos terhadap acuannya sendiri (konstruksi terjaga).
  const jawaban = faqAnswer("price-hotel", "id");
  assert.equal(semuaAngkaAdaDiMateri(jawaban, jawaban), true);
  // Bila acuan dipersempit (simulasi materi tanpa angka itu) → handoff.
  const hasil = putuskanDenganPengaman(
    { rute: "indicative-price", topik: "price-hotel", keyakinan: 0.95 },
    { kind: "faq", topic: "price-hotel" },
    "materi tanpa angka",
  );
  assert.deepEqual(hasil, {
    kind: "handoff",
    trigger: "custom-quote-or-availability",
  });
});
