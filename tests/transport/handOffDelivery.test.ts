/**
 * Tes wiring runtime: webhook → seam percakapan → kanal admin + metrik.
 * Tes perilaku seam ada di tests/conversation/; tes ini memastikan tindakan
 * terlihat benar-benar diteruskan ke kanal admin dan dapat dihitung.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createAppServer } from "../../src/server.ts";
import { loadConfig } from "../../src/config.ts";
import { InMemoryConversationStore } from "../../src/conversationStore.ts";
import { InMemoryMetrics } from "../../src/metrics.ts";
import type { AdminChannel, AdminHandoff } from "../../src/adminChannel.ts";
import type { InboundTransport } from "../../src/inboundTransport.ts";
import type { MessageSender } from "../../src/messageSender.ts";
import type { InboundMessage } from "../../src/conversation/types.ts";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

interface Lingkungan {
  appUrl: string;
  balasanTerkirim: Array<{ readonly to: string; readonly text: string }>;
  handoffs: AdminHandoff[];
  /** Jadikan pengiriman ke kanal admin gagal (untuk menguji jalur kegagalan). */
  aturKanalGagal: (gagal: boolean) => void;
  metrics: InMemoryMetrics;
  tutup: () => Promise<void>;
}

/** Lingkungan runtime dengan port di-stub: stub hanya di batas sistem (port). */
async function buatLingkungan(): Promise<Lingkungan> {
  const balasanTerkirim: Array<{ readonly to: string; readonly text: string }> = [];
  const handoffs: AdminHandoff[] = [];
  let kanalGagal = false;
  const metrics = new InMemoryMetrics();

  const adminChannel: AdminChannel = {
    deliver: (handoff: AdminHandoff): void => {
      if (kanalGagal) {
        throw new Error("kanal admin tidak tersedia");
      }
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

  const config = loadConfig(envKonfigurasi);
  const server = createAppServer({
    config,
    sender,
    inbound,
    conversations: new InMemoryConversationStore(),
    adminChannel,
    metrics,
  });
  const port = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${port}`,
    balasanTerkirim,
    handoffs,
    aturKanalGagal: (gagal: boolean) => {
      kanalGagal = gagal;
    },
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
    id: `wamid.integration.${nomorPesan}`,
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

/** Jalankan alur Permintaan Tindak Lanjut lengkap sampai persetujuan diberikan. */
async function jalankanAlurLengkap(lingkungan: Lingkungan, persetujuan: string): Promise<void> {
  await kirimPesan(lingkungan, "Halo, saya ingin konsultasi untuk merencanakan umrah");
  await kirimPesan(lingkungan, "Umrah premium, tujuan Mekkah");
  await kirimPesan(lingkungan, "Rencana Desember 2025");
  await kirimPesan(lingkungan, "4 orang");
  await kirimPesan(lingkungan, "Butuh kamar keluarga");
  await kirimPesan(lingkungan, "Sekitar 50 juta");
  await kirimPesan(lingkungan, persetujuan);
}

test("permintaan yang disetujui diteruskan ke kanal admin lengkap dengan ringkasan dan konteks percakapan", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await jalankanAlurLengkap(lingkungan, "Ya, setuju");

    assert.equal(lingkungan.handoffs.length, 1);
    const handoff = lingkungan.handoffs[0];
    assert.ok(handoff);
    assert.equal(handoff.reason, "follow-up-request");
    assert.deepEqual(handoff.request, {
      serviceOrDestination: "Umrah premium, tujuan Mekkah",
      travelDateOrPeriod: "Rencana Desember 2025",
      travellerCount: "4 orang",
      mainNeeds: "Butuh kamar keluarga",
      budgetRange: "Sekitar 50 juta",
    });
    const isiRiwayat = handoff.history.map((t) => t.text);
    assert.ok(isiRiwayat.includes("Umrah premium, tujuan Mekkah"));
    assert.ok(isiRiwayat.some((t) => t.includes("diteruskan")));

    const balasanTerakhir = lingkungan.balasanTerkirim.at(-1);
    assert.ok(balasanTerakhir);
    assert.match(balasanTerakhir.text, /diteruskan/i);
  } finally {
    await lingkungan.tutup();
  }
});

test("permintaan yang ditolak tidak diteruskan ke kanal admin", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await jalankanAlurLengkap(lingkungan, "tidak, jangan diteruskan");
    assert.deepEqual(lingkungan.handoffs, []);
    assert.deepEqual(lingkungan.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 0,
    });
  } finally {
    await lingkungan.tutup();
  }
});

test("permintaan yang berhasil diteruskan dapat dihitung sebagai metrik utama", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await jalankanAlurLengkap(lingkungan, "ya");
    assert.deepEqual(lingkungan.metrics.snapshot(), {
      followUpRequestsRecorded: 1,
      followUpRequestsForwarded: 1,
      handOffsForwarded: 1,
    });

    const respon = await fetch(`${lingkungan.appUrl}/metrics`);
    assert.equal(respon.status, 200);
    assert.deepEqual(await respon.json(), {
      followUpRequestsRecorded: 1,
      followUpRequestsForwarded: 1,
      handOffsForwarded: 1,
    });
  } finally {
    await lingkungan.tutup();
  }
});

test("kegagalan kanal admin tidak menghasilkan klaim penerusan maupun metrik", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, "Saya mau bicara dengan manusia saja");
    lingkungan.aturKanalGagal(true);
    await kirimPesan(lingkungan, "ya");

    assert.deepEqual(lingkungan.handoffs, []);
    assert.deepEqual(lingkungan.metrics.snapshot(), {
      followUpRequestsRecorded: 0,
      followUpRequestsForwarded: 0,
      handOffsForwarded: 0,
    });
    const balasanTerakhir = lingkungan.balasanTerkirim.at(-1);
    assert.ok(balasanTerakhir);
    assert.match(balasanTerakhir.text, /maaf|sorry/i);
    assert.doesNotMatch(balasanTerakhir.text, /(teruskan|diteruskan|forward)/i);
  } finally {
    await lingkungan.tutup();
  }
});
