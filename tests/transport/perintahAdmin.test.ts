/**
 * Tes wiring perintah admin (tiket 02): pesan berawalan `#` dari
 * `WHATSAPP_ADMIN_NUMBER` diproses di layer server **sebelum** seam percakapan,
 * efeknya lewat `JedaStore`, dan konfirmasinya hanya dikirim ke nomor admin.
 *
 * Seam `handleInbound` tidak dilalui untuk perintah (tidak ada `conversations`
 * yang dimuat/disimpan dan tidak ada balasan ke calon jemaah), sedangkan `#`
 * dari nomor selain admin tetap diperlakukan sebagai pesan biasa.
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
import type { TranscriptEntry } from "../../src/conversationTranscript.ts";
import { JedaStorePalsu } from "../pembantuJeda.ts";

const NOMOR_ADMIN = "6282283886627";
const NOMOR_JEMAAH = "628123456789";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

/** Store percakapan yang merekam pemanggilan, supaya seam dapat dipastikan tidak dilewati. */
class ConversationStorePantau extends InMemoryConversationStore {
  readonly dipanggil: string[] = [];

  override load(sender: string): ReturnType<InMemoryConversationStore["load"]> {
    this.dipanggil.push(`load:${sender}`);
    return super.load(sender);
  }

  override save(sender: string, context: Parameters<InMemoryConversationStore["save"]>[1]): void {
    this.dipanggil.push(`save:${sender}`);
    super.save(sender, context);
  }
}

interface Lingkungan {
  appUrl: string;
  pesanKeluar: Array<{ readonly to: string; readonly text: string }>;
  store: JedaStorePalsu;
  conversations: ConversationStorePantau;
  transkrip: TranscriptEntry[];
  handoffs: AdminHandoff[];
  tutup: () => Promise<void>;
}

/** Lingkungan runtime dengan port di-stub: hanya batas sistem yang diganti. */
async function buatLingkungan(opsi: ConstructorParameters<typeof JedaStorePalsu>[0] = {}): Promise<Lingkungan> {
  const pesanKeluar: Array<{ readonly to: string; readonly text: string }> = [];
  const transkrip: TranscriptEntry[] = [];
  const handoffs: AdminHandoff[] = [];
  const store = new JedaStorePalsu(opsi);
  const conversations = new ConversationStorePantau();

  const sender: MessageSender = {
    sendText: async (to: string, text: string): Promise<void> => {
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
  const adminChannel: AdminChannel = {
    deliver: (handoff: AdminHandoff): void => {
      handoffs.push(handoff);
    },
  };

  const server = createAppServer({
    config: loadConfig(envKonfigurasi),
    sender,
    inbound,
    conversations,
    adminChannel,
    metrics: new InMemoryMetrics(),
    transcript: { record: (entry) => transkrip.push(entry) },
    jeda: store,
  });
  const port = await dengarkan(server);

  return {
    appUrl: `http://127.0.0.1:${port}`,
    pesanKeluar,
    store,
    conversations,
    transkrip,
    handoffs,
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
async function kirimPesan(lingkungan: Lingkungan, dari: string, text: string): Promise<Response> {
  nomorPesan += 1;
  const pesan: InboundMessage = {
    id: `wamid.perintah.${nomorPesan}`,
    from: dari,
    timestamp: "1727000000",
    text,
  };
  return fetch(`${lingkungan.appUrl}/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([pesan]),
  });
}

test("#jeda <nomor> dari admin menjeda kontak sebelum seam dan hanya mengonfirmasi ke admin", async () => {
  const lingkungan = await buatLingkungan();
  try {
    const respon = await kirimPesan(lingkungan, NOMOR_ADMIN, "#jeda 628123456789");

    assert.equal(respon.status, 200);
    assert.equal(lingkungan.store.isPaused("628123456789"), true);
    assert.deepEqual(
      lingkungan.pesanKeluar.map((p) => p.to),
      [NOMOR_ADMIN],
    );
    assert.match(lingkungan.pesanKeluar[0]!.text, /628123456789/);
    assert.match(lingkungan.pesanKeluar[0]!.text, /#lanjut 628123456789/);
    // Seam tidak dilewati: konteks percakapan tidak dimuat/disimpan.
    assert.deepEqual(lingkungan.conversations.dipanggil, []);
    // Perintah admin tidak masuk transkrip pelanggan.
    assert.deepEqual(lingkungan.transkrip, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("#jeda tanpa nomor dari admin memakai kontak handoff terakhir", async () => {
  const lingkungan = await buatLingkungan({ lastHandoffContact: NOMOR_JEMAAH });
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#jeda");

    assert.equal(lingkungan.store.isPaused(NOMOR_JEMAAH), true);
    assert.match(lingkungan.pesanKeluar[0]!.text, new RegExp(NOMOR_JEMAAH));
  } finally {
    await lingkungan.tutup();
  }
});

test("#jeda tanpa nomor dan tanpa handoff terakhir meminta nomor eksplisit", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#jeda");

    assert.match(lingkungan.pesanKeluar[0]!.text, /#jeda 628123456789/);
    assert.deepEqual(lingkungan.store.snapshot().pausedContacts, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("nomor tidak valid dari admin ditolak tanpa mengubah state", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#jeda 12");

    assert.match(lingkungan.pesanKeluar[0]!.text, /[Nn]omor tidak valid/);
    assert.deepEqual(lingkungan.store.snapshot().pausedContacts, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("#lanjut <nomor> dari admin mengakhiri jeda kontak", async () => {
  const lingkungan = await buatLingkungan({ dijeda: [NOMOR_JEMAAH] });
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#lanjut 628123456789");

    assert.equal(lingkungan.store.isPaused(NOMOR_JEMAAH), false);
    assert.match(lingkungan.pesanKeluar[0]!.text, new RegExp(NOMOR_JEMAAH));
  } finally {
    await lingkungan.tutup();
  }
});

test("#bot off lalu #bot on bekerja walau Nonaktif Sementara sedang aktif", async () => {
  const lingkungan = await buatLingkungan({ globallyPaused: true });
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#bot on");
    assert.equal(lingkungan.store.snapshot().globallyPaused, false);

    await kirimPesan(lingkungan, NOMOR_ADMIN, "#bot off");
    assert.equal(lingkungan.store.snapshot().globallyPaused, true);
    assert.match(lingkungan.pesanKeluar.at(-1)!.text, /#bot on/);
  } finally {
    await lingkungan.tutup();
  }
});

test("#status dari admin meringkas status global dan kontak dijeda", async () => {
  const lingkungan = await buatLingkungan({ globallyPaused: true, dijeda: [NOMOR_JEMAAH] });
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#status");

    const balasan = lingkungan.pesanKeluar[0]!.text;
    assert.match(balasan, /Nonaktif Sementara: aktif/);
    assert.match(balasan, new RegExp(NOMOR_JEMAAH));
    assert.match(balasan, /2026-10-10 10:00:00/);
    assert.deepEqual(lingkungan.conversations.dipanggil, []);
    assert.deepEqual(lingkungan.transkrip, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("perintah tak dikenal dari admin dibalas daftar perintah tanpa mengubah state", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, NOMOR_ADMIN, "#tanya");

    const balasan = lingkungan.pesanKeluar[0]!.text;
    assert.match(balasan, /#jeda/);
    assert.match(balasan, /#status/);
    assert.deepEqual(lingkungan.store.panggilan, []);
  } finally {
    await lingkungan.tutup();
  }
});

test("#jeda dari nomor selain admin diperlakukan sebagai pesan biasa ke jalur percakapan", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, NOMOR_JEMAAH, "#jeda");

    // State jeda tidak tersentuh dan balasan tidak ke nomor admin.
    assert.deepEqual(lingkungan.store.panggilan, []);
    assert.deepEqual(
      lingkungan.pesanKeluar.filter((p) => p.to === NOMOR_ADMIN),
      [],
    );
    // Pesan tetap masuk jalur normal: konteks dimuat/disimpan dan tercatat.
    assert.equal(lingkungan.conversations.dipanggil.includes(`load:${NOMOR_JEMAAH}`), true);
    assert.equal(lingkungan.conversations.dipanggil.includes(`save:${NOMOR_JEMAAH}`), true);
    // Dua baris: pesan masuk (calon jemaah) dan balasan bot (asisten).
    assert.deepEqual(
      lingkungan.transkrip.map((baris) => baris.role),
      ["calon-jemaah", "asisten"],
    );
    assert.equal(lingkungan.transkrip[0]!.number, NOMOR_JEMAAH);
  } finally {
    await lingkungan.tutup();
  }
});

test("handoff ke admin mencatat kontak handoff terakhir untuk #jeda tanpa nomor", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await kirimPesan(lingkungan, NOMOR_JEMAAH, "Saya mau bicara dengan manusia saja");
    await kirimPesan(lingkungan, NOMOR_JEMAAH, "ya");

    assert.equal(lingkungan.handoffs.length, 1);
    assert.equal(lingkungan.store.snapshot().lastHandoffContact, NOMOR_JEMAAH);
  } finally {
    await lingkungan.tutup();
  }
});
