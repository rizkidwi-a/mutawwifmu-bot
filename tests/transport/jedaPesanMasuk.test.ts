/**
 * Tes gerbang Jeda Percakapan pada jalur pesan masuk (tiket 03). Gerbang hidup
 * di layer server, di luar seam `handleInbound`: pesan dari kontak yang dijeda
 * — atau saat Nonaktif Sementara — tetap tercatat satu baris di transkrip
 * sebagai calon jemaah apa adanya, tetapi tidak dibalas dan tidak menyentuh
 * state alur percakapan (`conversations.load`/`save` tidak dipanggil).
 *
 * Kontak lain tetap dibalas normal. Perintah admin (tiket 02) diproses sebelum
 * gerbang, sehingga `#bot on`/`#lanjut` tetap menjadi jalan kembali saat bot
 * nonaktif. Diuji dari luar seam lewat `createAppServer` dengan dependency palsu.
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
import type { ConversationContext, ConversationTurn, InboundMessage } from "../../src/conversation/types.ts";
import type { TranscriptEntry } from "../../src/conversationTranscript.ts";
import { JedaStorePalsu } from "../pembantuJeda.ts";

const NOMOR_DIJEDA = "628111111111";
const NOMOR_LAIN = "628222222222";
const NOMOR_ADMIN = "6282283886627";

const envKonfigurasi: Record<string, string> = {
  WHATSAPP_PROVIDER: "fonnte",
  WHATSAPP_SENDER_NUMBER: "+62 895 0700 3830",
  WHATSAPP_ADMIN_NUMBER: "+62 822 8388 6627",
  WHATSAPP_API_TOKEN: "token-fonnte",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-webhook",
};

/** Store percakapan yang merekam pemanggilan, supaya state alur dapat dipastikan utuh. */
class ConversationStorePantau extends InMemoryConversationStore {
  readonly dipanggil: string[] = [];

  /** Isi konteks awal tanpa tercatat sebagai pemanggilan, untuk memeriksa keutuhan riwayat. */
  seed(nomor: string, context: ConversationContext): void {
    super.save(nomor, context);
  }

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
  readonly appUrl: string;
  readonly pesanKeluar: Array<{ readonly to: string; readonly text: string }>;
  readonly store: JedaStorePalsu;
  readonly conversations: ConversationStorePantau;
  readonly transkrip: TranscriptEntry[];
  kirim(pesan: InboundMessage): Promise<number>;
  tutup: () => Promise<void>;
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

async function buatLingkungan(opsi: {
  transcript?: { record(entry: TranscriptEntry): void };
  seed?: (store: ConversationStorePantau) => void;
} = {}): Promise<Lingkungan> {
  const pesanKeluar: Array<{ to: string; text: string }> = [];
  const transkrip: TranscriptEntry[] = [];
  const handoffs: AdminHandoff[] = [];
  const store = new JedaStorePalsu();
  const conversations = new ConversationStorePantau();
  opsi.seed?.(conversations);

  const sender: MessageSender = {
    sendText: async (to, text) => {
      pesanKeluar.push({ to, text });
    },
  };
  const inbound: InboundTransport = {
    handleSubscription: () => null,
    readInbound: async (request) => ({
      ok: true as const,
      messages: JSON.parse(request.rawBody.toString("utf8")) as InboundMessage[],
    }),
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
    transcript: opsi.transcript ?? { record: (entry) => transkrip.push(entry) },
    jeda: store,
  });
  const port = await dengarkan(server);
  const appUrl = `http://127.0.0.1:${port}`;

  return {
    appUrl,
    pesanKeluar,
    store,
    conversations,
    transkrip,
    async kirim(pesan) {
      const respon = await fetch(`${appUrl}/webhook?token=token-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([pesan]),
      });
      return respon.status;
    },
    tutup: () => tutup(server),
  };
}

let urutanPesan = 0;

function pesan(nomor: string, teks: string | null): InboundMessage {
  urutanPesan += 1;
  return { id: `in-${urutanPesan}`, from: nomor, timestamp: "1727000000", text: teks };
}

test("kontak yang dijeda: satu baris transkrip, tanpa balasan, state alur utuh", async () => {
  const riwayatAwal: ConversationTurn[] = [
    { role: "calon-jemaah", text: "Halo, saya ingin tanya umrah" },
    { role: "asisten", text: "Baik, boleh dijelaskan kebutuhannya?" },
  ];
  const lingkungan = await buatLingkungan({
    seed: (store) => {
      store.seed(NOMOR_DIJEDA, { history: riwayatAwal });
    },
  });
  try {
    lingkungan.store.pauseContact(NOMOR_DIJEDA);

    const status = await lingkungan.kirim(pesan(NOMOR_DIJEDA, "Halo, masih ada?"));

    assert.equal(status, 200);
    assert.equal(lingkungan.pesanKeluar.length, 0, "tidak ada balasan ke kontak yang dijeda");
    assert.deepEqual(lingkungan.conversations.dipanggil, [], "state alur tidak dibaca maupun ditulis");
    assert.deepEqual(
      lingkungan.conversations.load(NOMOR_DIJEDA).history,
      riwayatAwal,
      "riwayat kontak tetap utuh",
    );
    assert.equal(lingkungan.transkrip.length, 1, "satu baris transkrip untuk pesan selama jeda");
    assert.equal(lingkungan.transkrip[0]!.number, NOMOR_DIJEDA);
    assert.equal(lingkungan.transkrip[0]!.role, "calon-jemaah");
    assert.equal(lingkungan.transkrip[0]!.text, "Halo, masih ada?");
  } finally {
    await lingkungan.tutup();
  }
});

test("kontak tidak dijeda tetap dibalas normal seperti sebelumnya", async () => {
  const lingkungan = await buatLingkungan();
  try {
    await lingkungan.kirim(pesan(NOMOR_LAIN, "Halo"));

    assert.equal(lingkungan.pesanKeluar.length, 1, "kontak lain tetap dibalas");
    assert.equal(lingkungan.pesanKeluar[0]!.to, NOMOR_LAIN);
    assert.deepEqual(lingkungan.conversations.dipanggil, [`load:${NOMOR_LAIN}`, `save:${NOMOR_LAIN}`]);
    assert.deepEqual(
      lingkungan.transkrip.map((baris) => baris.role),
      ["calon-jemaah", "asisten"],
    );
  } finally {
    await lingkungan.tutup();
  }
});

test("Nonaktif Sementara global menahan semua kontak", async () => {
  const lingkungan = await buatLingkungan();
  try {
    lingkungan.store.pauseGlobally();

    await lingkungan.kirim(pesan(NOMOR_DIJEDA, "Ada admin?"));
    await lingkungan.kirim(pesan(NOMOR_LAIN, "Halo"));

    assert.equal(lingkungan.pesanKeluar.length, 0, "tidak ada balasan selama Nonaktif Sementara");
    assert.deepEqual(lingkungan.conversations.dipanggil, [], "state alur semua kontak tidak disentuh");
    assert.deepEqual(
      lingkungan.transkrip.map((baris) => [baris.number, baris.role]),
      [
        [NOMOR_DIJEDA, "calon-jemaah"],
        [NOMOR_LAIN, "calon-jemaah"],
      ],
    );
  } finally {
    await lingkungan.tutup();
  }
});

test("perintah admin tetap diproses saat Nonaktif Sementara (#bot on)", async () => {
  const lingkungan = await buatLingkungan();
  try {
    lingkungan.store.pauseGlobally();
    assert.equal(lingkungan.store.isPaused(NOMOR_LAIN), true);

    await lingkungan.kirim(pesan(NOMOR_ADMIN, "#bot on"));

    assert.equal(lingkungan.pesanKeluar.length, 1, "konfirmasi perintah tetap dikirim ke admin");
    assert.equal(lingkungan.pesanKeluar[0]!.to, NOMOR_ADMIN);
    assert.equal(lingkungan.store.isPaused(NOMOR_LAIN), false, "gerbang tidak menahan jalan kembali");
    assert.deepEqual(lingkungan.conversations.dipanggil, [], "perintah tidak melewati seam percakapan");
    assert.ok(
      !lingkungan.transkrip.some((baris) => baris.number === NOMOR_ADMIN),
      "perintah admin bukan pesan calon jemaah",
    );

    // Setelah #bot on, kontak biasa kembali dibalas.
    await lingkungan.kirim(pesan(NOMOR_LAIN, "Halo"));
    assert.equal(lingkungan.pesanKeluar.length, 2);
    assert.equal(lingkungan.pesanKeluar[1]!.to, NOMOR_LAIN);
  } finally {
    await lingkungan.tutup();
  }
});

test("pemulihan #lanjut: kontak dibalas lagi setelah jeda berakhir", async () => {
  const lingkungan = await buatLingkungan();
  try {
    lingkungan.store.pauseContact(NOMOR_DIJEDA);

    await lingkungan.kirim(pesan(NOMOR_DIJEDA, "Halo"));
    assert.equal(lingkungan.pesanKeluar.length, 0, "selama jeda tidak ada balasan");

    await lingkungan.kirim(pesan(NOMOR_ADMIN, `#lanjut ${NOMOR_DIJEDA}`));
    assert.equal(lingkungan.store.isPaused(NOMOR_DIJEDA), false, "jeda berakhir lewat #lanjut");

    await lingkungan.kirim(pesan(NOMOR_DIJEDA, "Halo"));
    assert.equal(lingkungan.pesanKeluar.length, 2, "konfirmasi admin + balasan setelah pemulihan");
    assert.equal(lingkungan.pesanKeluar[1]!.to, NOMOR_DIJEDA);
    assert.equal(lingkungan.transkrip.length, 3, "pesan selama jeda + pesan masuk + balasan");
  } finally {
    await lingkungan.tutup();
  }
});

test("pesan non-teks saat jeda tercatat dengan sebutan lampirannya", async () => {
  const lingkungan = await buatLingkungan();
  try {
    lingkungan.store.pauseContact(NOMOR_DIJEDA);

    await lingkungan.kirim(pesan(NOMOR_DIJEDA, null));

    assert.equal(lingkungan.pesanKeluar.length, 0, "lampiran selama jeda tidak dibalas");
    assert.deepEqual(lingkungan.conversations.dipanggil, [], "lampiran tidak masuk state alur");
    assert.equal(lingkungan.transkrip.length, 1);
    assert.equal(lingkungan.transkrip[0]!.role, "calon-jemaah");
    assert.equal(lingkungan.transkrip[0]!.text, "Lampiran: pesan non-teks");
  } finally {
    await lingkungan.tutup();
  }
});

test("kegagalan transkrip tidak mengubah keputusan diam", async (t) => {
  const errorLog = t.mock.method(console, "error", () => {});
  const lingkungan = await buatLingkungan({
    transcript: {
      record: () => {
        throw new Error("berkas transkrip tidak dapat ditulis");
      },
    },
  });
  try {
    lingkungan.store.pauseContact(NOMOR_DIJEDA);

    const status = await lingkungan.kirim(pesan(NOMOR_DIJEDA, "Halo"));

    assert.equal(status, 200, "kegagalan transkrip tidak menggagalkan permintaan");
    assert.equal(lingkungan.pesanKeluar.length, 0, "keputusan diam tetap berlaku");
    assert.deepEqual(lingkungan.conversations.dipanggil, [], "state alur tetap tidak disentuh");
    assert.ok(errorLog.mock.calls.length >= 1, "kegagalan transkrip dicatat ke log");
    assert.match(String(errorLog.mock.calls[0]!.arguments[0]), /transkrip/i);
  } finally {
    await lingkungan.tutup();
  }
});
