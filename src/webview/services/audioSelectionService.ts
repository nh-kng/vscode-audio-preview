import { EventType } from "../events";
import Service from "../service";

/** A time range shared by every chart in the inspector. */
export interface AudioSelection {
  startSeconds: number;
  endSeconds: number;
}

export type AudioSelectionBoundary = "start" | "end";

/**
 * Owns the current audio selection for one loaded file.
 *
 * Keeping this state outside of a chart means waveform, spectrogram and all
 * channels can update their highlights together, including while a drag is in
 * progress. The service is created per loaded file and disposed on reload.
 */
export default class AudioSelectionService extends Service {
  private readonly _duration: number;
  private _selection: AudioSelection | null = null;

  public constructor(duration: number) {
    super();
    this._duration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  }

  public get duration(): number {
    return this._duration;
  }

  public get selection(): AudioSelection | null {
    return this._selection ? { ...this._selection } : null;
  }

  public get hasSelection(): boolean {
    return (
      this._selection !== null &&
      this._selection.endSeconds > this._selection.startSeconds
    );
  }

  /** Set a range, normalizing reverse drags and clamping to the file. */
  public setSelection(startSeconds: number, endSeconds: number): void {
    const start = Number(startSeconds);
    const end = Number(endSeconds);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      this.clearSelection();
      return;
    }

    const normalizedStart = Math.min(start, end);
    const normalizedEnd = Math.max(start, end);
    const next: AudioSelection = {
      startSeconds: Math.min(this._duration, Math.max(0, normalizedStart)),
      endSeconds: Math.min(this._duration, Math.max(0, normalizedEnd)),
    };

    // A click or a zero-width drag is not a selection. Treat it as cleared so
    // consumers can use hasSelection as the single validity check.
    this._selection = next.endSeconds > next.startSeconds ? next : null;
    this.dispatchSelectionUpdate();
  }

  /** Move one endpoint while keeping the other endpoint fixed. */
  public setBoundary(
    boundary: AudioSelectionBoundary,
    seconds: number,
    minimumDuration: number = Number.EPSILON,
  ): void {
    if (!this._selection || !Number.isFinite(seconds)) {
      return;
    }

    const start = this._selection.startSeconds;
    const end = this._selection.endSeconds;
    const minimum = Math.min(
      Math.max(0, Number.isFinite(minimumDuration) ? minimumDuration : 0),
      end - start,
    );
    const value = Math.min(this._duration, Math.max(0, seconds));
    const next =
      boundary === "start"
        ? {
            startSeconds: Math.min(value, end - minimum),
            endSeconds: end,
          }
        : {
            startSeconds: start,
            endSeconds: Math.max(value, start + minimum),
          };

    this._selection = next;
    this.dispatchSelectionUpdate();
  }

  public clearSelection(): void {
    if (this._selection === null) {
      return;
    }
    this._selection = null;
    this.dispatchSelectionUpdate();
  }

  private dispatchSelectionUpdate(): void {
    this.dispatchEvent(
      new CustomEvent(EventType.SELECTION_UPDATE, {
        detail: { selection: this.selection },
      }),
    );
  }
}
