/**
 * Entry point proses bot WhatsApp. Berjalan setiap saat; hentikan dengan SIGINT.
 */

import { createTransport } from "./adapters/factory.ts";
import { WhatsAppAdminChannel } from "./adminChannel.ts";
import { loadConfig } from "./config.ts";
import { InMemoryConversationStore } from "./conversationStore.ts";
import { CsvConversationTranscript } from "./conversationTranscript.ts";
import { InMemoryMetrics } from "./metrics.ts";
import { FileJedaStore } from "./jedaStore.ts";
import { createAppServer } from "./server.ts";

const config = loadConfig(process.env);
const { sender, inbound } = createTransport(config.whatsapp);

// Kanal admin sesuai keputusan pemilik (ADR-0006): handoff dikirim sebagai
// pesan WhatsApp ke nomor admin yang dikonfigurasi, melalui provider yang sama.
const adminChannel = new WhatsAppAdminChannel(sender, config.adminNumber);
const conversations = new InMemoryConversationStore();
const metrics = new InMemoryMetrics();
// Transkrip CSV untuk pemilik (tiket 08), efek samping di luar seam percakapan.
const transcript = new CsvConversationTranscript();
// State Jeda Percakapan + Nonaktif Sementara (tiket 01), persisten di data/.
const jeda = new FileJedaStore();

const server = createAppServer({
  config,
  sender,
  inbound,
  conversations,
  adminChannel,
  metrics,
  transcript,
  jeda,
});

server.listen(config.port, () => {
  console.log(
    `Bot WhatsApp MUTAWWIFMU siap — provider ${config.whatsapp.provider}, ` +
      `nomor pengirim ${config.whatsapp.senderNumber}, port ${config.port}`,
  );
});
