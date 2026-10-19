/**
 * Port penyimpanan konteks percakapan per nomor calon jemaah. Keputusan
 * persistent store/retensi data belum diambil (spec "Implementation Decisions")
 * dan tidak dikunci di sini; implementasi in-memory adalah yang sementara.
 */

import type { ConversationContext } from "./conversation/types.ts";

export interface ConversationStore {
  /** Konteks percakapan terakhir untuk nomor pengirim; kosong bila belum ada. */
  load(sender: string): ConversationContext;
  save(sender: string, context: ConversationContext): void;
}

/** Penyimpanan dalam proses; riwayat hilang saat proses berhenti. */
export class InMemoryConversationStore implements ConversationStore {
  private readonly contexts = new Map<string, ConversationContext>();

  load(sender: string): ConversationContext {
    return this.contexts.get(sender) ?? { history: [] };
  }

  save(sender: string, context: ConversationContext): void {
    this.contexts.set(sender, context);
  }
}
