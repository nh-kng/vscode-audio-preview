import "./figureInteractionComponent.css";
import { EventType } from "../../events";
import PlayerService from "../../services/playerService";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService, {
  AnalyzeSettingsProps,
  FrequencyScale,
} from "../../services/analyzeSettingsService";
import AudioSelectionService, {
  AudioSelectionBoundary,
} from "../../services/audioSelectionService";
import Component from "../../component";

const dragThresholdPx = 3;
type DragMode =
  | "selection"
  | "timeZoom"
  | "valueZoom"
  | "selectionStart"
  | "selectionEnd";

export default class FigureInteractionComponent extends Component {
  private _root: HTMLElement;
  private _input: HTMLDivElement;
  private _overlay: HTMLDivElement;
  private _startHandle: HTMLButtonElement;
  private _endHandle: HTMLButtonElement;
  private _bar: HTMLDivElement;
  private _waveform: boolean;
  private _player: PlayerService;
  private _analyze: AnalyzeService;
  private _settingsService: AnalyzeSettingsService;
  private _buffer: AudioBuffer;
  private _settings: AnalyzeSettingsProps;
  private _selection: AudioSelectionService;
  private _ownsSelection = false;
  private _drag = false;
  private _downX = 0;
  private _downY = 0;
  private _currentX = 0;
  private _currentY = 0;
  private _moved = false;
  private _mode: DragMode = "selection";

  constructor(
    selector: string,
    onWaveformCanvas: boolean,
    playerService: PlayerService,
    analyzeService: AnalyzeService,
    settingsService: AnalyzeSettingsService,
    audioBuffer: AudioBuffer,
    settings: AnalyzeSettingsProps,
    selectionService?: AudioSelectionService,
  ) {
    super();
    this._root = document.querySelector(selector);
    this._waveform = onWaveformCanvas;
    this._player = playerService;
    this._analyze = analyzeService;
    this._settingsService = settingsService;
    this._buffer = audioBuffer;
    this._settings = settings;
    this._selection =
      selectionService || new AudioSelectionService(audioBuffer.duration);
    this._ownsSelection = !selectionService;

    this._bar = document.createElement("div");
    this._bar.className = "visibleBar";
    this._root.appendChild(this._bar);
    this._overlay = document.createElement("div");
    this._overlay.className = "selectionOverlay";
    this._overlay.setAttribute("aria-hidden", "true");
    this._root.appendChild(this._overlay);
    this._input = document.createElement("div");
    this._input.className = "userInputDiv";
    this._input.setAttribute("role", "group");
    this._input.setAttribute(
      "aria-label",
      onWaveformCanvas
        ? "Interactive waveform: click to seek or drag to select"
        : "Interactive spectrogram: click to seek or drag to select",
    );
    this._root.appendChild(this._input);
    this._startHandle = this.createSelectionHandle("start");
    this._endHandle = this.createSelectionHandle("end");

    this._addEventlistener(
      playerService,
      EventType.UPDATE_SEEKBAR,
      (e: CustomEventInit) => this.updateBar(Number(e.detail?.value)),
    );
    this._addEventlistener(this._selection, EventType.SELECTION_UPDATE, () =>
      this.updateSelection(),
    );
    this._addEventlistener(this._input, EventType.MOUSE_DOWN, (e: MouseEvent) =>
      this.onDown(e),
    );
    this._addEventlistener(
      this._input,
      EventType.CONTEXT_MENU,
      (e: MouseEvent) => e.preventDefault(),
    );
    this._addEventlistener(window, EventType.MOUSE_MOVE, (e: MouseEvent) =>
      this.onMove(e),
    );
    this._addEventlistener(window, EventType.MOUSE_UP, (e: MouseEvent) =>
      this.onUp(e),
    );
    this.updateBar(0);
    this.updateSelection();
  }

  private onDown(event: MouseEvent) {
    if (event.button !== 0) {
      if (event.button === 2) {
        this.resetZoom(event);
      }
      return;
    }
    event.preventDefault();
    const rect = this._input.getBoundingClientRect();
    this._downX = this.clamp(event.clientX - rect.left, rect.width);
    this._downY = this.clamp(event.clientY - rect.top, rect.height);
    this._currentX = this._downX;
    this._currentY = this._downY;
    this._moved = false;
    this._drag = true;
    this._mode = event.ctrlKey
      ? "timeZoom"
      : event.shiftKey
        ? "valueZoom"
        : "selection";
  }

  private onMove(event: MouseEvent) {
    if (!this._drag) {
      return;
    }
    const rect = this._input.getBoundingClientRect();
    this._currentX = this.clamp(event.clientX - rect.left, rect.width);
    this._currentY = this.clamp(event.clientY - rect.top, rect.height);
    this._moved =
      this._moved ||
      Math.abs(this._currentX - this._downX) >= dragThresholdPx ||
      Math.abs(this._currentY - this._downY) >= dragThresholdPx;
    if (
      this._moved &&
      (this._mode === "selectionStart" || this._mode === "selectionEnd")
    ) {
      this.setSelectionBoundary(
        this._mode === "selectionStart" ? "start" : "end",
      );
    } else if (this._moved && this._mode === "selection") {
      this._selection.setSelection(
        this.time(Math.min(this._downX, this._currentX), rect.width),
        this.time(Math.max(this._downX, this._currentX), rect.width),
      );
    }
    if (
      this._moved &&
      this._mode !== "selectionStart" &&
      this._mode !== "selectionEnd"
    ) {
      this.drawDrag();
    }
  }

  private onUp(event: MouseEvent) {
    if (!this._drag) {
      return;
    }
    const rect = this._input.getBoundingClientRect();
    const x = this.clamp(event.clientX - rect.left, rect.width);
    const y = this.clamp(event.clientY - rect.top, rect.height);
    const moved = this._moved;
    const mode = this._mode;
    const downX = this._downX;
    const downY = this._downY;
    this._drag = false;
    if (mode === "selectionStart" || mode === "selectionEnd") {
      if (moved) {
        this.setSelectionBoundary(
          mode === "selectionStart" ? "start" : "end",
          x,
          rect.width,
        );
      }
      this.updateSelection();
      return;
    }
    if (!moved) {
      this.seek(x, rect.width);
    } else if (mode === "selection") {
      this._selection.setSelection(
        this.time(Math.min(downX, x), rect.width),
        this.time(Math.max(downX, x), rect.width),
      );
    } else if (mode === "timeZoom") {
      this.timeZoom(downX, x, rect.width);
      this.updateSelection();
    } else {
      this.valueZoom(downY, y, rect.height);
      this.updateSelection();
    }
  }

  private seek(x: number, width: number) {
    const duration = this._buffer.duration;
    this._player.onSeekbarInput(
      duration > 0 ? (this.time(x, width) / duration) * 100 : 0,
    );
  }

  private timeZoom(startX: number, endX: number, width: number) {
    const start = this.time(Math.min(startX, endX), width);
    const end = this.time(Math.max(startX, endX), width);
    if (end <= start) {
      return;
    }
    this._settingsService.minTime = start;
    this._settingsService.maxTime = end;
    this._analyze.analyze();
  }

  private valueZoom(startY: number, endY: number, height: number) {
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    if (maxY <= minY) {
      return;
    }
    if (this._waveform) {
      const range = this._settings.maxAmplitude - this._settings.minAmplitude;
      this._settingsService.minAmplitude =
        (1 - maxY / height) * range + this._settings.minAmplitude;
      this._settingsService.maxAmplitude =
        (1 - minY / height) * range + this._settings.minAmplitude;
    } else {
      this._settingsService.minFrequency = this.value(maxY, height);
      this._settingsService.maxFrequency = this.value(minY, height);
    }
    this._analyze.analyze();
  }

  private value(y: number, height: number): number {
    const fraction = 1 - y / height;
    const min = this._settings.minFrequency;
    const max = this._settings.maxFrequency;
    if (this._settings.frequencyScale === FrequencyScale.Log) {
      const low = Math.log10(Math.max(1, min));
      const high = Math.log10(Math.max(1, max));
      return Math.pow(10, low + fraction * (high - low));
    }
    if (this._settings.frequencyScale === FrequencyScale.Mel) {
      const low = AnalyzeService.hzToMel(min);
      const high = AnalyzeService.hzToMel(max);
      return AnalyzeService.melToHz(low + fraction * (high - low));
    }
    return min + fraction * (max - min);
  }

  private resetZoom(event: MouseEvent) {
    if (event.ctrlKey) {
      this._settingsService.resetToDefaultTimeRange();
    } else if (event.shiftKey) {
      this._settingsService.resetToDefaultAmplitudeRange();
      this._settingsService.resetToDefaultFrequencyRange();
    } else {
      this._settingsService.resetToDefaultTimeRange();
      this._settingsService.resetToDefaultAmplitudeRange();
      this._settingsService.resetToDefaultFrequencyRange();
    }
    this._analyze.analyze();
  }

  private drawDrag() {
    const rect = this._input.getBoundingClientRect();
    this._overlay.style.display = "block";
    this._overlay.style.left =
      (this._mode === "valueZoom" ? 0 : Math.min(this._downX, this._currentX)) +
      "px";
    this._overlay.style.top =
      (this._mode === "timeZoom" || this._mode === "selection"
        ? 0
        : Math.min(this._downY, this._currentY)) + "px";
    this._overlay.style.width =
      (this._mode === "valueZoom"
        ? rect.width
        : Math.abs(this._currentX - this._downX)) + "px";
    this._overlay.style.height =
      (this._mode === "timeZoom" || this._mode === "selection"
        ? rect.height
        : Math.abs(this._currentY - this._downY)) + "px";
  }

  private createSelectionHandle(
    boundary: AudioSelectionBoundary,
  ): HTMLButtonElement {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "selectionHandle selectionHandle--" + boundary;
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", boundary + " selection boundary");
    handle.setAttribute("aria-orientation", "horizontal");
    handle.tabIndex = 0;
    this._root.appendChild(handle);
    this._addEventlistener(handle, EventType.MOUSE_DOWN, (event: MouseEvent) =>
      this.onHandleDown(event, boundary),
    );
    this._addEventlistener(handle, EventType.KEY_DOWN, (event: KeyboardEvent) =>
      this.onHandleKeyDown(event, boundary),
    );
    return handle;
  }

  private onHandleDown(event: MouseEvent, boundary: AudioSelectionBoundary) {
    if (!this._selection.hasSelection) {
      return;
    }
    if (event.button !== 0) {
      if (event.button === 2) {
        event.preventDefault();
        this.resetZoom(event);
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = this._input.getBoundingClientRect();
    this._downX = this.clamp(event.clientX - rect.left, rect.width);
    this._downY = this.clamp(event.clientY - rect.top, rect.height);
    this._currentX = this._downX;
    this._currentY = this._downY;
    this._moved = false;
    this._drag = true;
    this._mode = boundary === "start" ? "selectionStart" : "selectionEnd";
    (event.currentTarget as HTMLElement).focus();
  }

  private onHandleKeyDown(
    event: KeyboardEvent,
    boundary: AudioSelectionBoundary,
  ) {
    const selection = this._selection.selection;
    if (!selection) {
      return;
    }
    const direction =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    let next: number | undefined;
    if (direction !== 0) {
      const step = event.shiftKey
        ? 1
        : Math.max(0.1, 1 / this._buffer.sampleRate);
      const value =
        boundary === "start" ? selection.startSeconds : selection.endSeconds;
      next = value + direction * step;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = this._buffer.duration;
    }
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this._selection.setBoundary(boundary, next, 1 / this._buffer.sampleRate);
  }

  private setSelectionBoundary(
    boundary: AudioSelectionBoundary,
    x = this._currentX,
    width = this._input.getBoundingClientRect().width,
  ) {
    this._selection.setBoundary(
      boundary,
      this.time(x, width),
      1 / this._buffer.sampleRate,
    );
  }

  private updateBar(value: number) {
    const seconds = (value * this._buffer.duration) / 100;
    const range = this._settings.maxTime - this._settings.minTime;
    const percent =
      range > 0 ? ((seconds - this._settings.minTime) / range) * 100 : 0;
    this._bar.style.width = Math.min(100, Math.max(0, percent)) + "%";
  }

  private updateSelection() {
    const selection = this._selection.selection;
    if (!this._selection.hasSelection || !selection) {
      this._overlay.style.display = "none";
      this._startHandle.style.display = "none";
      this._endHandle.style.display = "none";
      return;
    }
    const range = this._settings.maxTime - this._settings.minTime;
    if (
      range <= 0 ||
      selection.endSeconds <= this._settings.minTime ||
      selection.startSeconds >= this._settings.maxTime
    ) {
      this._overlay.style.display = "none";
      this._startHandle.style.display = "none";
      this._endHandle.style.display = "none";
      return;
    }
    const start = Math.max(selection.startSeconds, this._settings.minTime);
    const end = Math.min(selection.endSeconds, this._settings.maxTime);
    this._overlay.style.display = "block";
    this._overlay.style.left =
      ((start - this._settings.minTime) / range) * 100 + "%";
    this._overlay.style.width = ((end - start) / range) * 100 + "%";
    this._overlay.style.top = "0";
    this._overlay.style.height = "100%";
    this.updateSelectionHandle(
      this._startHandle,
      selection.startSeconds,
      selection.startSeconds >= this._settings.minTime &&
        selection.startSeconds <= this._settings.maxTime,
      range,
    );
    this.updateSelectionHandle(
      this._endHandle,
      selection.endSeconds,
      selection.endSeconds >= this._settings.minTime &&
        selection.endSeconds <= this._settings.maxTime,
      range,
    );
  }

  private updateSelectionHandle(
    handle: HTMLButtonElement,
    seconds: number,
    visible: boolean,
    range: number,
  ) {
    handle.style.display = visible ? "block" : "none";
    if (!visible) {
      return;
    }
    handle.style.left =
      ((seconds - this._settings.minTime) / range) * 100 + "%";
    handle.setAttribute("aria-valuemin", "0");
    handle.setAttribute("aria-valuemax", String(this._selection.duration));
    handle.setAttribute("aria-valuenow", String(seconds));
    handle.setAttribute(
      "aria-valuetext",
      formatBoundaryTime(seconds, this._selection.duration >= 3600),
    );
  }

  private time(x: number, width: number) {
    const fraction = width > 0 ? x / width : 0;
    return Math.min(
      this._buffer.duration,
      Math.max(
        0,
        this._settings.minTime +
          fraction * (this._settings.maxTime - this._settings.minTime),
      ),
    );
  }

  private clamp(value: number, size: number) {
    return Math.min(size, Math.max(0, Number.isFinite(value) ? value : 0));
  }

  public dispose() {
    if (this._ownsSelection) {
      this._selection.dispose();
      this._ownsSelection = false;
    }
    super.dispose();
  }
}

function formatBoundaryTime(seconds: number, useHours: boolean): string {
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
