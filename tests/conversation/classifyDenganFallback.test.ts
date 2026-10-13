/**
 * Kebijakan penggabungan hasil model dengan hasil regex (tiket 01): pemicu
 * deterministik berisiko tinggi yang sudah dikenali regex harus tetap menang
 * atas klasifikasi model, dan alasan handoff spesifik dari regex dipertahankan.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDenganFallback,
  putuskanDenganPengaman,
} from "../../src/conversation/classifyDenganFallback.ts";
import {
  classifyInbound,
  type HandoffTrigger,
  type InboundRouting,
} from "../../src/conversation/classifyInbound.ts";
import type { Pemahaman } from "../../src/knowledge/geminiPemaham.ts";

/** Enam kelompok pemicu handoff berisiko tinggi beserta pesan pemicunya. */
const PEMICU_BERISIKO: ReadonlyArray<{ pesan: string; trigger: HandoffTrigger }> = [
  { pesan: "ini darurat, tolong bantu", trigger: "emergency" },
  { pesan: "saya sedang di makkah sekarang, hotelnya bagaimana", trigger: "active-trip" },
  { pesan: "bicara dengan admin dong", trigger: "human-request" },
  { pesan: "kami dari agen travel, mau kerja sama", trigger: "agency-or-corporate" },
  { pesan: "mau bayar DP untuk 4 orang", trigger: "booking-or-payment" },
  { pesan: "minta penawaran untuk 10 orang", trigger: "custom-quote-or-availability" },
];

const MODEL_FAQ: Pemahaman = { rute: "faq", topik: "transport-fleet", keyakinan: 0.95 };
const MODEL_OPENER: Pemahaman = { rute: "opener", keyakinan: 0.95 };
const MODEL_HARGA: Pemahaman = { rute: "indicative-price", topik: "price-hotel", keyakinan: 0.95 };
const MODEL_HANDOFF: Pemahaman = { rute: "handoff", keyakinan: 0.95 };

for (const { pesan, trigger } of PEMICU_BERISIKO) {
  test(`pemicu regex ${trigger} tetap menang atas hasil model`, async () => {
    const fallback = classifyInbound(pesan);
    assert.deepEqual(fallback, { kind: "handoff", trigger });
    for (const pemahaman of [MODEL_FAQ, MODEL_OPENER, MODEL_HARGA, MODEL_HANDOFF]) {
      const hasil = await classifyDenganFallback(pesan, { pemahaman });
      assert.deepEqual(
        hasil,
        fallback,
        `model ${pemahaman.rute} tidak boleh menurunkan ${trigger} menjadi ${hasil.kind}`,
      );
    }
  });
}

test("alasan handoff spesifik dari regex dipertahankan apa adanya", () => {
  const fallback: InboundRouting = { kind: "handoff", trigger: "human-request" };
  const hasil = putuskanDenganPengaman(MODEL_HANDOFF, fallback);
  assert.deepEqual(hasil, { kind: "handoff", trigger: "human-request" });
});

test("handoff tanpa pemicu berisiko tetap dapat diperbaiki model", async () => {
  // "boleh minta pricelist?" jatuh ke handoff unsupported-question di regex;
  // trigger ini di luar kelompok berisiko sehingga hasil model tetap dipakai.
  const hasil = await classifyDenganFallback("boleh minta pricelist?", {
    pemahaman: { rute: "faq", topik: "price-hotel", keyakinan: 0.9 },
  });
  assert.deepEqual(hasil, { kind: "faq", topic: "price-hotel" });
});

test("pemahaman null tetap jatuh ke hasil regex, termasuk pemicu berisiko", async () => {
  const hasil = await classifyDenganFallback("mau bayar DP untuk 4 orang", {
    pemahaman: null,
  });
  assert.deepEqual(hasil, { kind: "handoff", trigger: "booking-or-payment" });
});
