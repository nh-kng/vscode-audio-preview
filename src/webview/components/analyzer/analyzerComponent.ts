import "./analyzerComponent.css";
import { EventType } from "../../events";
import Component from "../../component";
import PlayerService from "../../services/playerService";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import AudioSelectionService from "../../services/audioSelectionService";
import WaveFormComponent from "../waveform/waveFormComponent";
import SpectrogramComponent from "../spectrogram/spectrogramComponent";
import FigureInteractionComponent from "../figureInteraction/figureInteractionComponent";
import EasyCutComponent from "../easyCut/easyCutComponent";
import { PostMessage } from "../../../message";
import { iconMarkup } from "../../icons";

const analysisSettingEvents = [
  EventType.AS_UPDATE_WAVEFORM_VISIBLE,
  EventType.AS_UPDATE_SPECTROGRAM_VISIBLE,
  EventType.AS_UPDATE_WINDOW_SIZE_INDEX,
  EventType.AS_UPDATE_FREQUENCY_SCALE,
  EventType.AS_UPDATE_MEL_FILTER_NUM,
  EventType.AS_UPDATE_MIN_FREQUENCY,
  EventType.AS_UPDATE_MAX_FREQUENCY,
  EventType.AS_UPDATE_MIN_TIME,
  EventType.AS_UPDATE_MAX_TIME,
  EventType.AS_UPDATE_MIN_AMPLITUDE,
  EventType.AS_UPDATE_MAX_AMPLITUDE,
  EventType.AS_UPDATE_SPECTROGRAM_AMPLITUDE_RANGE,
];

export default class AnalyzerComponent extends Component {
  private _selector: string;
  private _root: HTMLElement;
  private _buffer: AudioBuffer;
  private _analyze: AnalyzeService;
  private _settings: AnalyzeSettingsService;
  private _player: PlayerService;
  private _selection: AudioSelectionService;
  private _ownsSelection = false;
  private _analyzeButton: HTMLButtonElement;
  private _result: HTMLElement;
  private _figureInteractions: FigureInteractionComponent[] = [];
  private _themeObserver?: MutationObserver;
  private _selectionActions?: EasyCutComponent;
  private _renderedSettings?: ReturnType<AnalyzeSettingsService["toProps"]>;
  private _renderedWaveformVisible?: boolean;
  private _renderedSpectrogramVisible?: boolean;
  private _hasAnalysis = false;
  private _reanalyzePending = false;

  constructor(
    componentRootSelector: string,
    audioBuffer: AudioBuffer,
    analyzeService: AnalyzeService,
    analyzeSettingsService: AnalyzeSettingsService,
    playerService: PlayerService,
    autoAnalyze: boolean,
    postMessage?: PostMessage,
    filename?: string,
    selectionService?: AudioSelectionService,
  ) {
    super();
    this._selector = componentRootSelector;
    this._root = document.querySelector(componentRootSelector);
    this._buffer = audioBuffer;
    this._analyze = analyzeService;
    this._settings = analyzeSettingsService;
    this._player = playerService;
    this._selection =
      selectionService || new AudioSelectionService(audioBuffer.duration);
    this._ownsSelection = !selectionService;
    this._root.innerHTML =
      '<div class="analyzerComponent">' +
      '<div class="analyzerHeader"><h2>Analysis</h2>' +
      '<button type="button" class="analyzeButton" aria-label="Analyze audio" title="Analyze audio">' +
      iconMarkup("pulse", "actionIcon") +
      "<span>Analyze audio</span></button></div>" +
      '<div class="analyzerEmptyState" aria-live="polite">' +
      '<strong class="analyzerEmptyStateTitle">No analysis yet</strong>' +
      '<span class="analyzerEmptyStateDescription">Analyze this audio to view its waveform and spectrogram.</span>' +
      "</div>" +
      '<div class="analyzeResultBox" aria-live="polite"></div><div class="selectionActionsRoot"></div></div>';
    this._analyzeButton = this._root.querySelector(".analyzeButton");
    this._result = this._root.querySelector(".analyzeResultBox");
    this._addEventlistener(this._analyze, EventType.ANALYZE, () =>
      this.renderAnalyzeResult(),
    );
    this._addEventlistener(this._analyzeButton, EventType.CLICK, () => {
      this._result.style.display = "block";
      this._analyze.analyze();
    });
    analysisSettingEvents.forEach((eventType) => {
      this._addEventlistener(this._settings, eventType, () =>
        this.handleSettingsUpdate(),
      );
    });
    this._selectionActions = new EasyCutComponent(
      componentRootSelector + " .selectionActionsRoot",
      audioBuffer,
      this._selection,
      postMessage || (() => undefined),
      filename,
    );
    this._register(this._selectionActions);
    this._themeObserver = new MutationObserver(() => {
      if (
        this._result.style.display !== "none" &&
        this._result.children.length
      ) {
        this.renderAnalyzeResult(this._renderedSettings);
      }
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    this._themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    if (autoAnalyze) {
      this._analyze.analyze();
    }
  }

  private handleSettingsUpdate() {
    if (!this._hasAnalysis) {
      return;
    }
    this._reanalyzePending = this.settingsDifferFromRendered();
    this.updateAnalyzeButton();
  }

  private settingsDifferFromRendered() {
    if (!this._renderedSettings) {
      return true;
    }
    const currentSettings = this._settings.toProps();
    const settingKeys = Object.keys(this._renderedSettings) as Array<
      keyof ReturnType<AnalyzeSettingsService["toProps"]>
    >;
    return (
      this._renderedWaveformVisible !== this._settings.waveformVisible ||
      this._renderedSpectrogramVisible !== this._settings.spectrogramVisible ||
      settingKeys.some(
        (key) => currentSettings[key] !== this._renderedSettings[key],
      )
    );
  }

  private updateAnalyzeButton() {
    const label = this._reanalyzePending ? "Reanalyze" : "Analyze audio";
    this._analyzeButton.querySelector("span").textContent = label;
    this._analyzeButton.setAttribute("aria-label", label);
    this._analyzeButton.setAttribute("title", label);
    this._analyzeButton.style.display =
      this._reanalyzePending || !this._hasAnalysis ? "inline-flex" : "none";
  }

  private clearResult() {
    this._figureInteractions.forEach((interaction) => interaction.dispose());
    this._figureInteractions = [];
    this._result.innerHTML = "";
  }

  private renderAnalyzeResult(
    renderedSettings?: ReturnType<AnalyzeSettingsService["toProps"]>,
  ) {
    const isThemeRedraw = renderedSettings !== undefined;
    const pendingBeforeRender = this._reanalyzePending;
    this._hasAnalysis = true;
    this._reanalyzePending = false;
    this.updateAnalyzeButton();
    this._result.style.display = "block";
    this.clearResult();
    const settings = renderedSettings || this._settings.toProps();
    this._renderedSettings = settings;
    if (!isThemeRedraw) {
      this._renderedWaveformVisible = this._settings.waveformVisible;
      this._renderedSpectrogramVisible = this._settings.spectrogramVisible;
    }
    const waveformVisible = isThemeRedraw
      ? this._renderedWaveformVisible
      : this._settings.waveformVisible;
    const spectrogramVisible = isThemeRedraw
      ? this._renderedSpectrogramVisible
      : this._settings.spectrogramVisible;
    if (waveformVisible) {
      const group = this.createGroup("Waveform");
      for (let ch = 0; ch < this._buffer.numberOfChannels; ch++) {
        this.createWaveform(group, ch, settings);
      }
    }
    if (spectrogramVisible) {
      const group = this.createGroup("Spectrogram");
      for (let ch = 0; ch < this._buffer.numberOfChannels; ch++) {
        this.createSpectrogram(group, ch, settings);
      }
    }
    const emptyState = this._root.querySelector(
      ".analyzerEmptyState",
    ) as HTMLElement;
    if (this._result.children.length) {
      emptyState.style.display = "none";
    } else {
      emptyState.querySelector(".analyzerEmptyStateTitle").textContent =
        "No analysis results are visible";
      emptyState.querySelector(".analyzerEmptyStateDescription").textContent =
        "Enable Waveform or Spectrogram in Settings, then reanalyze.";
      emptyState.style.display = "block";
    }
    if (isThemeRedraw) {
      this._reanalyzePending = pendingBeforeRender;
      this.updateAnalyzeButton();
    }
  }

  private createGroup(name: string): HTMLElement {
    const group = document.createElement("section");
    group.className = "analyzerGroup";
    const heading = document.createElement("h3");
    heading.className = "analyzerGroupTitle";
    heading.textContent = name;
    group.appendChild(heading);
    this._result.appendChild(group);
    return group;
  }

  private createFigure(
    group: HTMLElement,
    name: string,
    ch: number,
  ): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "analyzeFigure";
    const label = document.createElement("figcaption");
    label.className = "figureLabel";
    label.textContent = name + " · " + this.getChannelLabel(ch);
    figure.appendChild(label);
    group.appendChild(figure);
    const box = document.createElement("div");
    box.className = "canvasBox js-canvasBox" + name + ch;
    box.setAttribute("aria-label", name + " " + this.getChannelLabel(ch));
    figure.appendChild(box);
    return box;
  }

  private createWaveform(
    group: HTMLElement,
    ch: number,
    settings: ReturnType<AnalyzeSettingsService["toProps"]>,
  ) {
    this.createFigure(group, "Waveform", ch);
    new WaveFormComponent(
      this._selector + " .js-canvasBoxWaveform" + ch,
      AnalyzeSettingsService.WAVEFORM_CANVAS_WIDTH,
      AnalyzeSettingsService.WAVEFORM_CANVAS_HEIGHT *
        settings.waveformVerticalScale,
      settings,
      this._buffer.sampleRate,
      this._buffer.getChannelData(ch),
      ch,
      this._buffer.numberOfChannels,
    );
    this._figureInteractions.push(
      new FigureInteractionComponent(
        this._selector + " .js-canvasBoxWaveform" + ch,
        true,
        this._player,
        this._analyze,
        this._settings,
        this._buffer,
        settings,
        this._selection,
      ),
    );
  }

  private createSpectrogram(
    group: HTMLElement,
    ch: number,
    settings: ReturnType<AnalyzeSettingsService["toProps"]>,
  ) {
    this.createFigure(group, "Spectrogram", ch);
    new SpectrogramComponent(
      this._selector + " .js-canvasBoxSpectrogram" + ch,
      AnalyzeSettingsService.SPECTROGRAM_CANVAS_WIDTH,
      AnalyzeSettingsService.SPECTROGRAM_CANVAS_HEIGHT *
        settings.spectrogramVerticalScale,
      this._analyze,
      settings,
      this._buffer.sampleRate,
      ch,
      this._buffer.numberOfChannels,
    );
    this._figureInteractions.push(
      new FigureInteractionComponent(
        this._selector + " .js-canvasBoxSpectrogram" + ch,
        false,
        this._player,
        this._analyze,
        this._settings,
        this._buffer,
        settings,
        this._selection,
      ),
    );
  }

  private getChannelLabel(ch: number) {
    if (this._buffer.numberOfChannels === 2) {
      return ch === 0 ? "Left channel" : "Right channel";
    }
    return "Channel " + (ch + 1);
  }

  public dispose() {
    this._themeObserver?.disconnect();
    this._figureInteractions.forEach((interaction) => interaction.dispose());
    this._figureInteractions = [];
    this._selectionActions?.dispose();
    this._selectionActions = undefined;
    if (this._ownsSelection) {
      this._selection.dispose();
      this._ownsSelection = false;
    }
    super.dispose();
  }
}
