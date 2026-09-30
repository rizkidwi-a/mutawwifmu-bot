/**
 * Port metrik keberhasilan (spec user story 40). Metrik utama: Permintaan
 * Tindak Lanjut yang berhasil diteruskan ke kanal admin. Penyimpanan in-memory
 * sementara; agregasi jangka panjang belum diputuskan.
 */

export interface MetricsSnapshot {
  /** Permintaan Tindak Lanjut yang disetujui calon jemaah dan tercatat. */
  readonly followUpRequestsRecorded: number;
  /** Metrik utama: Permintaan Tindak Lanjut yang berhasil diteruskan ke admin. */
  readonly followUpRequestsForwarded: number;
  /** Semua handoff yang berhasil diteruskan (termasuk tanpa Permintaan Tindak Lanjut). */
  readonly handOffsForwarded: number;
}

export interface Metrics {
  recordFollowUpRequest(): void;
  /** Catat handoff yang berhasil diteruskan; `withRequest` bila membawa Permintaan Tindak Lanjut. */
  recordHandOffDelivered(withRequest: boolean): void;
  snapshot(): MetricsSnapshot;
}

export class InMemoryMetrics implements Metrics {
  private followUpRequestsRecorded = 0;
  private followUpRequestsForwarded = 0;
  private handOffsForwarded = 0;

  recordFollowUpRequest(): void {
    this.followUpRequestsRecorded += 1;
  }

  recordHandOffDelivered(withRequest: boolean): void {
    this.handOffsForwarded += 1;
    if (withRequest) {
      this.followUpRequestsForwarded += 1;
    }
  }

  snapshot(): MetricsSnapshot {
    return {
      followUpRequestsRecorded: this.followUpRequestsRecorded,
      followUpRequestsForwarded: this.followUpRequestsForwarded,
      handOffsForwarded: this.handOffsForwarded,
    };
  }
}
