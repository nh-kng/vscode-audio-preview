import "./analyzeSettingsComponent.css";
import Component from "../../component";
import { EventType } from "../../events";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService, {
  AnalyzeSettingsProps,
} from "../../services/analyzeSettingsService";

export default class AnalyzeSettingsComponent extends Component {
  private _mountRoot: HTMLElement;
  private _componentRoot: HTMLElement;
  private _analyzeService: AnalyzeService;
  private _analyzeSettingsService: AnalyzeSettingsService;
  private _themeObserver?: MutationObserver;
  private _renderedSettings?: AnalyzeSettingsProps;

  constructor(
    componentRootSelector: string,
    analyzeService: AnalyzeService,
    analyzeSettingsService: AnalyzeSettingsService,
    queryRoot?: HTMLElement,
  ) {
    super();
    this._mountRoot = document.querySelector(componentRootSelector);
    this._componentRoot = queryRoot || this._mountRoot;
    this._analyzeService = analyzeService;
    this._analyzeSettingsService = analyzeSettingsService;

    this._mountRoot.innerHTML = `
    <div class="analyzeSetting">
      <fieldset data-setting-section="analysis" aria-label="Analysis">
        <div class="analyzeSetting__row analyzeSetting__rangeRow">
          <label for="minTime">Start time <span><input id="minTime" class="analyzeSetting__input js-analyzeSetting-minTime" type="number" step="0.1" aria-label="Analysis start time"> s</span></label>
          <span aria-hidden="true">to</span>
          <label for="maxTime">End time <span><input id="maxTime" class="analyzeSetting__input js-analyzeSetting-maxTime" type="number" step="0.1" aria-label="Analysis end time"> s</span></label>
        </div>
      </fieldset>

      <fieldset data-setting-section="waveform" aria-label="Waveform">
        <label class="analyzeSetting__checkLabel">
          <input class="js-analyzeSetting-waveformVisible" type="checkbox">
          <span>Show waveform</span>
        </label>
        <div class="analyzeSetting__row">
          <label for="minAmplitude">Amplitude range
            <span><input id="minAmplitude" class="analyzeSetting__input js-analyzeSetting-minAmplitude" type="number" step="0.1" aria-label="Minimum waveform amplitude"> to <input id="maxAmplitude" class="analyzeSetting__input js-analyzeSetting-maxAmplitude" type="number" step="0.1" aria-label="Maximum waveform amplitude"></span>
          </label>
        </div>
      </fieldset>

      <fieldset data-setting-section="spectrogram" aria-label="Spectrogram">
        <label class="analyzeSetting__checkLabel">
          <input class="js-analyzeSetting-spectrogramVisible" type="checkbox">
          <span>Show spectrogram</span>
        </label>
        <div class="analyzeSetting__row">
          <label for="windowSize">Window size
            <select id="windowSize" class="analyzeSetting__select js-analyzeSetting-windowSize" aria-label="Spectrogram window size">
              <option value="0">256</option>
              <option value="1">512</option>
              <option value="2">1024</option>
              <option value="3">2048</option>
              <option value="4">4096</option>
              <option value="5">8192</option>
              <option value="6">16384</option>
              <option value="7">32768</option>
            </select>
          </label>
          <label for="frequencyScale">Frequency scale
            <select id="frequencyScale" class="analyzeSetting__select js-analyzeSetting-frequencyScale" aria-label="Spectrogram frequency scale">
              <option value="0">Linear</option>
              <option value="1">Log</option>
              <option value="2">Mel</option>
            </select>
          </label>
        </div>
        <div class="analyzeSetting__row">
          <label for="melFilterNum">Mel filter count
            <input id="melFilterNum" class="analyzeSetting__input js-analyzeSetting-melFilterNum" type="number" step="10">
          </label>
          <span></span>
        </div>
        <div class="analyzeSetting__row">
          <label for="minFrequency">Frequency range
            <span><input id="minFrequency" class="analyzeSetting__input js-analyzeSetting-minFrequency" type="number" step="1000" aria-label="Minimum frequency"> to <input id="maxFrequency" class="analyzeSetting__input js-analyzeSetting-maxFrequency" type="number" step="1000" aria-label="Maximum frequency"> Hz</span>
          </label>
        </div>
        <div class="analyzeSetting__row">
          <label for="spectrogramAmplitudeRange">Amplitude range
            <span><input id="spectrogramAmplitudeRange" class="analyzeSetting__input js-analyzeSetting-spectrogramAmplitudeRange" type="number" step="10"> dB to 0 dB</span>
          </label>
        </div>
        <div class="analyzeSetting__color">
          <span>Color scale</span>
          <canvas class="analyzeSetting__canvas js-analyzeSetting-spectrogramColorAxis" width="800" height="40" aria-label="Spectrogram color scale"></canvas>
          <canvas class="analyzeSetting__canvas js-analyzeSetting-spectrogramColor" width="100" height="5" aria-hidden="true"></canvas>
        </div>
      </fieldset>
    </div>
    `;

    this.initAnalyzerSettingUI();
    this._addEventlistener(this._analyzeService, EventType.ANALYZE, () => {
      this._renderedSettings = this._analyzeSettingsService.toProps();
    });
    this._themeObserver = new MutationObserver(() =>
      this.updateColorBar(
        this._renderedSettings || this._analyzeSettingsService.toProps(),
      ),
    );
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    this._themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }

  private initAnalyzerSettingUI() {
    const settings = this._analyzeSettingsService;

    // init waveform visible checkbox
    const waveformVisible = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-waveformVisible")
    );
    waveformVisible.checked = settings.waveformVisible;
    this._addEventlistener(waveformVisible, EventType.CHANGE, () => {
      settings.waveformVisible = waveformVisible.checked;
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_WAVEFORM_VISIBLE,
      (e: CustomEventInit) => {
        waveformVisible.checked = e.detail.value;
      },
    );

    // init spectrogram visible checkbox
    const spectrogramVisible = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-spectrogramVisible")
    );
    spectrogramVisible.checked = settings.spectrogramVisible;
    this._addEventlistener(spectrogramVisible, EventType.CHANGE, () => {
      settings.spectrogramVisible = spectrogramVisible.checked;
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_SPECTROGRAM_VISIBLE,
      (e: CustomEventInit) => {
        spectrogramVisible.checked = e.detail.value;
      },
    );

    // init fft window size index select
    const windowSizeSelect = <HTMLSelectElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-windowSize")
    );
    windowSizeSelect.selectedIndex = settings.windowSizeIndex;
    this._addEventlistener(windowSizeSelect, EventType.CHANGE, () => {
      settings.windowSizeIndex = Number(windowSizeSelect.selectedIndex);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_WINDOW_SIZE_INDEX,
      (e: CustomEventInit) => {
        windowSizeSelect.selectedIndex = e.detail.value;
      },
    );

    // init frequency scale select
    const frequencyScaleSelect = <HTMLSelectElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-frequencyScale")
    );
    frequencyScaleSelect.selectedIndex = settings.frequencyScale;
    this._addEventlistener(frequencyScaleSelect, EventType.CHANGE, () => {
      settings.frequencyScale = Number(frequencyScaleSelect.selectedIndex);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_FREQUENCY_SCALE,
      (e: CustomEventInit) => {
        frequencyScaleSelect.selectedIndex = e.detail.value;
      },
    );

    // init mel filter num input
    const melFilterNumInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-melFilterNum")
    );
    melFilterNumInput.value = `${settings.melFilterNum}`;
    this._addEventlistener(melFilterNumInput, EventType.CHANGE, () => {
      settings.melFilterNum = Number(melFilterNumInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MEL_FILTER_NUM,
      (e: CustomEventInit) => {
        melFilterNumInput.value = `${e.detail.value}`;
      },
    );

    // init frequency range input
    const minFreqInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-minFrequency")
    );
    minFreqInput.value = `${settings.minFrequency}`;
    this._addEventlistener(minFreqInput, EventType.CHANGE, () => {
      settings.minFrequency = Number(minFreqInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MIN_FREQUENCY,
      (e: CustomEventInit) => {
        minFreqInput.value = `${e.detail.value}`;
      },
    );

    const maxFreqInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-maxFrequency")
    );
    maxFreqInput.value = `${settings.maxFrequency}`;
    this._addEventlistener(maxFreqInput, EventType.CHANGE, () => {
      settings.maxFrequency = Number(maxFreqInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MAX_FREQUENCY,
      (e: CustomEventInit) => {
        maxFreqInput.value = `${e.detail.value}`;
      },
    );

    // init time range input
    const minTimeInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-minTime")
    );
    minTimeInput.value = `${settings.minTime}`;
    this._addEventlistener(minTimeInput, EventType.CHANGE, () => {
      settings.minTime = Number(minTimeInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MIN_TIME,
      (e: CustomEventInit) => {
        minTimeInput.value = `${e.detail.value}`;
      },
    );

    const maxTimeInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-maxTime")
    );
    maxTimeInput.value = `${settings.maxTime}`;
    this._addEventlistener(maxTimeInput, EventType.CHANGE, () => {
      settings.maxTime = Number(maxTimeInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MAX_TIME,
      (e: CustomEventInit) => {
        maxTimeInput.value = `${e.detail.value}`;
      },
    );

    // init amplitude range input
    const minAmplitudeInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-minAmplitude")
    );
    minAmplitudeInput.value = `${settings.minAmplitude}`;
    this._addEventlistener(minAmplitudeInput, EventType.CHANGE, () => {
      settings.minAmplitude = Number(minAmplitudeInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MIN_AMPLITUDE,
      (e: CustomEventInit) => {
        minAmplitudeInput.value = `${e.detail.value}`;
      },
    );

    const maxAmplitudeInput = <HTMLInputElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-maxAmplitude")
    );
    maxAmplitudeInput.value = `${settings.maxAmplitude}`;
    this._addEventlistener(maxAmplitudeInput, EventType.CHANGE, () => {
      settings.maxAmplitude = Number(maxAmplitudeInput.value);
    });
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_MAX_AMPLITUDE,
      (e: CustomEventInit) => {
        maxAmplitudeInput.value = `${e.detail.value}`;
      },
    );

    // init spectrogram amplitude range input
    const spectrogramAmplitudeRangeInput = <HTMLInputElement>(
      this._componentRoot.querySelector(
        ".js-analyzeSetting-spectrogramAmplitudeRange",
      )
    );
    spectrogramAmplitudeRangeInput.value = `${settings.spectrogramAmplitudeRange}`;
    this.updateColorBar(settings);
    this._addEventlistener(
      spectrogramAmplitudeRangeInput,
      EventType.CHANGE,
      () => {
        settings.spectrogramAmplitudeRange = Number(
          spectrogramAmplitudeRangeInput.value,
        );
      },
    );
    this._addEventlistener(
      settings,
      EventType.AS_UPDATE_SPECTROGRAM_AMPLITUDE_RANGE,
      (e: CustomEventInit) => {
        spectrogramAmplitudeRangeInput.value = `${e.detail.value}`;
        this.updateColorBar(settings);
      },
    );
  }

  private updateColorBar(settings: AnalyzeSettingsProps) {
    // init color bar
    const colorCanvas = <HTMLCanvasElement>(
      this._componentRoot.querySelector(".js-analyzeSetting-spectrogramColor")
    );
    const colorAxisCanvas = <HTMLCanvasElement>(
      this._componentRoot.querySelector(
        ".js-analyzeSetting-spectrogramColorAxis",
      )
    );
    const colorContext = colorCanvas.getContext("2d", { alpha: false });
    const colorAxisContext = colorAxisCanvas.getContext("2d", { alpha: false });
    // clear axis label
    colorAxisContext.clearRect(
      0,
      0,
      colorAxisCanvas.width,
      colorAxisCanvas.height,
    );
    // draw axis label
    colorAxisContext.font = `15px Arial`;
    colorAxisContext.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--vscode-foreground")
        .trim() || "#cccccc";
    for (let i = 0; i < 10; i++) {
      const amp = (i * settings.spectrogramAmplitudeRange) / 10;
      const x = (i * colorAxisCanvas.width) / 10;
      colorAxisContext.fillText(`${amp} dB`, x, colorAxisCanvas.height);
    }
    // draw color
    for (let i = 0; i < 100; i++) {
      const amp = (i * settings.spectrogramAmplitudeRange) / 100;
      const x = (i * colorCanvas.width) / 100;
      colorContext.fillStyle = this._analyzeService.getSpectrogramColor(
        amp,
        settings.spectrogramAmplitudeRange,
      );
      colorContext.fillRect(x, 0, colorCanvas.width / 100, colorCanvas.height);
    }
  }

  public dispose() {
    this._themeObserver?.disconnect();
    super.dispose();
  }
}
