import "./easyCutComponent.css";
import { PostMessage, WebviewMessageType } from "../../../message";
import Component from "../../component";
import { EventType } from "../../events";
import AudioSelectionService from "../../services/audioSelectionService";
import { encodeToWav } from "../../encoder";

export default class EasyCutComponent extends Component {
  private _root: HTMLElement;
  private _selection: AudioSelectionService;
  private _audioBuffer: AudioBuffer;
  private _filename?: string;
  private _filenameInput: HTMLInputElement;
  private _summary: HTMLElement;
  private _row: HTMLElement;
  private _clearButton: HTMLButtonElement;

  constructor(
    componentRootSelector: string,
    audioBuffer: AudioBuffer,
    selectionService: AudioSelectionService,
    postMessage: PostMessage,
    filename?: string,
  ) {
    super();
    this._root = document.querySelector(componentRootSelector);
    this._selection = selectionService;
    this._audioBuffer = audioBuffer;
    this._filename = filename;
    this._root.innerHTML =
      '<div class="easyCut" hidden>' +
      '<div class="easyCut__summary" aria-live="polite"></div>' +
      '<label class="easyCut__filename">' +
      "<span>File name</span>" +
      '<input class="easyCut__filenameInput" type="text" autocomplete="off" aria-label="Selection file name">' +
      "</label>" +
      '<div class="easyCut__actions">' +
      '<button type="button" class="easyCut__button easyCut__button--clear secondary" title="Clear selection">Clear Selection</button>' +
      '<button type="button" class="easyCut__button easyCut__button--export" title="Export the selected range as a WAV file">Export Selection</button>' +
      "</div></div>";
    this._row = this._root.querySelector(".easyCut");
    this._summary = this._root.querySelector(".easyCut__summary");
    this._filenameInput = this._root.querySelector(".easyCut__filenameInput");
    this._clearButton = this._root.querySelector(".easyCut__button--clear");
    this._filenameInput.value = this.defaultFilename();
    this._addEventlistener(this._selection, EventType.SELECTION_UPDATE, () =>
      this.update(),
    );
    this._addEventlistener(this._clearButton, EventType.CLICK, () => {
      this._selection.clearSelection();
      const focusTarget = this._root
        .closest(".analyzerComponent")
        ?.querySelector(".analyzerHeader .analyzeButton") as HTMLElement | null;
      focusTarget?.focus();
    });
    this._addEventlistener(
      this._root.querySelector(".easyCut__button--export"),
      EventType.CLICK,
      () => this.exportSelection(postMessage),
    );
    this.update();
  }

  private update() {
    const selection = this._selection.selection;
    const valid = this._selection.hasSelection && selection !== null;
    this._row.hidden = !valid;
    if (!valid || !selection) {
      this._summary.textContent = "";
      return;
    }
    const duration = selection.endSeconds - selection.startSeconds;
    const useHours = this._selection.duration >= 3600;
    this._summary.textContent =
      "Selection: " +
      formatTime(selection.startSeconds, useHours) +
      " – " +
      formatTime(selection.endSeconds, useHours) +
      " (" +
      duration.toFixed(1) +
      "s)";
  }

  private exportSelection(postMessage: PostMessage) {
    const selection = this._selection.selection;
    if (!this._selection.hasSelection || !selection) {
      return;
    }
    const minIndex = Math.floor(
      selection.startSeconds * this._audioBuffer.sampleRate,
    );
    const maxIndex = Math.floor(
      selection.endSeconds * this._audioBuffer.sampleRate,
    );
    const audioData: Float32Array[] = [];
    for (let ch = 0; ch < this._audioBuffer.numberOfChannels; ch++) {
      audioData.push(
        this._audioBuffer.getChannelData(ch).slice(minIndex, maxIndex),
      );
    }
    const samples = encodeToWav(
      audioData,
      this._audioBuffer.sampleRate,
      this._audioBuffer.numberOfChannels,
    );
    postMessage({
      type: WebviewMessageType.WRITE_WAV,
      data: { filename: this.filename(), samples },
    });
  }

  private filename() {
    const candidate =
      this._filenameInput.value.trim() || this.defaultFilename();
    const sanitized = candidate
      .replace(/[<>:"/\\\\|?*]+/g, "_")
      .replace(/[\r\n]+/g, "_");
    return /\.wav$/i.test(sanitized) ? sanitized : sanitized + ".wav";
  }

  private defaultFilename() {
    const source = this._filename
      ? this._filename.replace(/\.[^/.]+$/, "")
      : "audio";
    return source.replace(/[<>:"/\\\\|?*]+/g, "_") + "_selection.wav";
  }
}

function formatTime(seconds: number, useHours: boolean): string {
  const totalTenths = Math.max(0, Math.round(seconds * 10));
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const secondsPart = String(totalSeconds % 60).padStart(2, "0") + "." + tenths;
  const minutes = Math.floor(totalSeconds / 60);
  if (useHours) {
    return (
      String(Math.floor(minutes / 60)).padStart(2, "0") +
      ":" +
      String(minutes % 60).padStart(2, "0") +
      ":" +
      secondsPart
    );
  }
  return String(minutes).padStart(2, "0") + ":" + secondsPart;
}
