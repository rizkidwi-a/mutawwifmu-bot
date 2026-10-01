/**
 * Tes wiring kanal admin WhatsApp (ADR-0006): webhook → seam percakapan →
 * pengiriman pesan handoff ke nomor admin melalui port MessageSender.
 * Kelengkapan isi handoff diuji di tests/adminChannel.test.ts; tes ini
 * memastikan server benar-benar menunggu penerusan sebelum mengklaim berhasil.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { loadConfig } from "../../src/config.ts";
import { WhatsAppAdminChannel } from "../../src/adminChannel.ts";
import { InMemoryConversationStore } from "../../src/conversationStore.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";
import type { InboundTransport } from "../../src/inboundTransport.ts";
import type { MessageSender } from "../../src/messageSender.ts";
import type { InboundMessage } from "../../src/conversation/types.ts";

const NOMOR_ADMIN = "6282283886627";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

interface Lingkungan {
  appUrl: string;
  pesanKeluar: Array<{ readonly to: string; readonly text: string }>;
  metrics: InMemoryMetrics;
  tutup: () => Promise<void>;
}

/** Lingkungan runtime dengan kanal admin WhatsApp sungguhan; hanya port yang distub. */
async function buatLingkungan(opsi: { adminGagal?: boolean } = {}): Promise<Lingkungan> {
  const pesanKeluar: Array<{ readonly to: string; readonly text: string }> = [];

  const sender: MessageSender = {
    sendText: async (to: string, text: string): Promise<void> => {
      if (opsi.adminGagal && to === NOMOR_ADMIN) {
        throw new Error("provider menolak pengiriman ke nomor admin");
      }
      pesanKeluar.push({ to, text });
    },
  };
  const inbound: InboundTransport = {
    handleSubscription: () => null,
    readInbound: async (request) => {
      const messages = JSON.parse(request.rawBody.toString("utf8")) as InboundMessage[];
      return { ok: true, messages };
    },
  };

  const metrics = new InMemoryMetrics();
  const server = createAppServer({
    config: loadConfig(envKonfigurasi),
    sender,
    inbound,
    conversations: new InMemoryConversationStore(),
    adminChannel: new WhatsAppAdminChannel(sender, NOMOR_ADMIN, () => {}),
    metrics,
    transcript: { record: () => {} },
  });
  const port = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${port}`,
    pesanKeluar,
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
    id: `wamid.admin-channel.${nomorPesan}`,
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

test("handoff yang disetujui dikirim sebagai pesan WhatsApp ke nomor admin", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, "Saya mau bicara dengan manusia saja");
    await kirimPesan(lingkungan, "ya");

    const keAdmin = lingkungan.pesanKeluar.filter((p) => p.to === NOMOR_ADMIN);
    assert.equal(keAdmin.length, 1);
    const handoffText = keAdmin[0]?.text ?? "";
    assert.match(handoffText, /human-request/);
    assert.match(handoffText, /628123456789/);

    const balasanKeJemaah = lingkungan.pesanKeluar.filter((p) => p.to === "628123456789").at(-1);
    assert.ok(balasanKeJemaah);
    assert.match(balasanKeJemaah.text, /diteruskan/i);
    assert.deepEqual(lingkungan.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 1,
      faqAnswered: 0,
    });
  } finally {
    await lingkungan.tutup();
  }
});

test("kegagalan pengiriman ke nomor admin tidak diklaim sebagai penerusan", async () => {
  const lingkungan = await buatLingkungan({ adminGagal: true });
  try {
    await kirimPesan(lingkungan, "Saya mau bicara dengan manusia saja");
    await kirimPesan(lingkungan, "ya");

    assert.equal(lingkungan.pesanKeluar.filter((p) => p.to === NOMOR_ADMIN).length, 0);
    const balasanKeJemaah = lingkungan.pesanKeluar.filter((p) => p.to === "628123456789").at(-1);
    assert.ok(balasanKeJemaah);
    assert.match(balasanKeJemaah.text, /maaf|sorry/i);
    assert.doesNotMatch(balasanKeJemaah.text, /(teruskan|diteruskan|forward)/i);
    assert.deepEqual(lingkungan.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 0,
      faqAnswered: 0,
    });
  } finally {
    await lingkungan.tutup();
  }
});
