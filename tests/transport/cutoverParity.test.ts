/**
 * Tes bukti cutover nomor produksi (tiket 06): pergantian nomor pengirim hanya
 * mengubah konfigurasi, dan jalur pertanyaan non-harga/intake serta handoff ke
 * admin tetap berfungsi dengan konfigurasi nomor produksi. Port distub pada
 * batas sistem (sama seperti tests/transport/handOffDelivery.test.ts);
 * perilaku percakapan sendiri diuji pada seam handleInbound di
 * tests/conversation/.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { loadConfig } from "../../src/config.ts";
import { InMemoryConversationStore } from "../../src/conversationStore.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";
import { JedaStorePalsu } from "../pembantuJeda.ts";
import type { AdminChannel, AdminHandoff } from "../../src/adminChannel.ts";
import type { InboundTransport } from "../../src/inboundTransport.ts";
import type { MessageSender } from "../../src/messageSender.ts";
import type { InboundMessage } from "../../src/conversation/types.ts";

const envNomorPengembangan: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

const envNomorProduksi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 812 9000 1111",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

interface Lingkungan {
  appUrl: string;
  balasanTerkirim: Array<{ readonly to: string; readonly text: string }>;
  handoffs: AdminHandoff[];
  metrics: InMemoryMetrics;
  tutup: () => Promise<void>;
}

/** Lingkungan runtime dengan port distub; `env` menentukan identitas nomor. */
async function buatLingkungan(env: Record<string, string>): Promise<Lingkungan> {
  const balasanTerkirim: Array<{ readonly to: string; readonly text: string }> = [];
  const handoffs: AdminHandoff[] = [];

  const adminChannel: AdminChannel = {
    deliver: (handoff: AdminHandoff): void => {
      handoffs.push(handoff);
    },
  };
  const inbound: InboundTransport = {
    handleSubscription: () => null,
    readInbound: async (request) => {
      const messages = JSON.parse(request.rawBody.toString("utf8")) as InboundMessage[];
      return { ok: true, messages };
    },
  };
  const sender: MessageSender = {
    sendText: async (to: string, text: string): Promise<void> => {
      balasanTerkirim.push({ to, text });
    },
  };

  const metrics = new InMemoryMetrics();
  const server = createAppServer({
    config: loadConfig(env),
    sender,
    inbound,
    conversations: new InMemoryConversationStore(),
    adminChannel,
    metrics,
    transcript: { record: () => {} },
    jeda: new JedaStorePalsu(),
  });
  const port = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${port}`,
    balasanTerkirim,
    handoffs,
    metrics,
    tutup: () => tutup(server),
  };
}

async function dengarkan(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const alamat = server.address();
  assert.ok(alamat && typeof alamat === "object");
  return alamat.port;
}

async function tutup(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

let nomorPesan = 0;
async function kirimPesan(lingkungan: Lingkungan, text: string): Promise<Response> {
  nomorPesan += 1;
  const pesan: InboundMessage = {
    id: `wamid.cutover.${nomorPesan}`,
    from: "628123456789",
    timestamp: "1727000000",
    text,
  };
  return fetch(`${lingkungan.appUrl}/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([pesan]),
  });
}

/** Percakapan yang memuat jalur pertanyaan non-harga dan jalur handoff sampai persetujuan. */
const PERCAKAPAN_CUTOVER = ["Apa itu land arrangement?", "Saya mau bicara dengan manusia saja", "ya"];

async function jalankanPercakapan(env: Record<string, string>): Promise<Lingkungan> {
  const lingkungan = await buatLingkungan(env);
  for (const pesan of PERCAKAPAN_CUTOVER) {
    await kirimPesan(lingkungan, pesan);
  }
  return lingkungan;
}

test("perilaku terlihat identik saat nomor pengirim diganti ke nomor produksi", async () => {
  const pengembangan = await jalankanPercakapan(envNomorPengembangan);
  const produksi = await jalankanPercakapan(envNomorProduksi);
  try {
    assert.deepEqual(
      produksi.balasanTerkirim.map((b) => b.text),
      pengembangan.balasanTerkirim.map((b) => b.text),
    );
    assert.deepEqual(produksi.handoffs, pengembangan.handoffs);
    assert.deepEqual(produksi.metrics.snapshot(), pengembangan.metrics.snapshot());
    assert.equal(pengembangan.handoffs.length, 1);
  } finally {
    await pengembangan.tutup();
    await produksi.tutup();
  }
});

test("jalur pertanyaan non-harga dan intake tetap berfungsi dengan konfigurasi nomor produksi", async () => {
  const produksi = await buatLingkungan(envNomorProduksi);
  try {
    await kirimPesan(produksi, "Apa itu land arrangement?");

    assert.deepEqual(produksi.handoffs, []);
    const balasanTerakhir = produksi.balasanTerkirim.at(-1);
    assert.ok(balasanTerakhir);
    // ADR-0009: pertanyaan non-harga tidak lagi dijawab dari materi.
    assert.doesNotMatch(balasanTerakhir.text, /Private Premium Umrah/);
    assert.match(balasanTerakhir.text, /layanan|tujuan/i);
    assert.deepEqual(produksi.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 0,
      faqAnswered: 0,
    });
  } finally {
    await produksi.tutup();
  }
});

test("handoff ke admin tetap berfungsi dengan konfigurasi nomor produksi", async () => {
  const produksi = await buatLingkungan(envNomorProduksi);
  try {
    await kirimPesan(produksi, "Saya mau bicara dengan manusia saja");
    await kirimPesan(produksi, "ya");

    assert.equal(produksi.handoffs.length, 1);
    const handoff = produksi.handoffs[0];
    assert.ok(handoff);
    assert.equal(handoff.reason, "human-request");
    assert.equal(handoff.from, "628123456789");
    const balasanTerakhir = produksi.balasanTerkirim.at(-1);
    assert.ok(balasanTerakhir);
    assert.match(balasanTerakhir.text, /diteruskan/i);
    assert.deepEqual(produksi.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 1,
      faqAnswered: 0,
    });
  } finally {
    await produksi.tutup();
  }
});
