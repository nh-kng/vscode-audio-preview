import "./settingTabComponent.css";
import Component from "../../component";
import PlayerSettingsService from "../../services/playerSettingsService";
import PlayerSettingsComponent from "../playerSettings/playerSettingsComponent";
import PlayerService from "../../services/playerService";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import AnalyzeSettingsComponent from "../analyzeSettings/analyzeSettingsComponent";

export default class SettingTab extends Component {
  private _root: HTMLElement;
  private _playerSettings?: PlayerSettingsComponent;
  private _analyzeSettings?: AnalyzeSettingsComponent;

  constructor(
    selector: string,
    playerSettingsService: PlayerSettingsService,
    analyzeService: AnalyzeService,
    analyzeSettingsService: AnalyzeSettingsService,
    _audioBuffer?: AudioBuffer,
    _postMessage?: unknown,
    playerService?: PlayerService,
  ) {
    super();
    void _audioBuffer;
    void _postMessage;
    void playerService;
    this._root = document.querySelector(selector);
    this._root.innerHTML =
      '<details class="settingTab">' +
      '<summary class="settingTab__summary"><span>Settings</span></summary>' +
      '<div class="settingTab__content">' +
      '<details class="settingTab__section"><summary>Playback Filters</summary><div class="js-settingTabContent-player"></div></details>' +
      '<details class="settingTab__section"><summary>Analysis</summary><div class="js-settingTabContent-analyze"></div></details>' +
      '<details class="settingTab__section"><summary>Waveform</summary><div class="analyzeSetting js-settingTabContent-waveform"></div></details>' +
      '<details class="settingTab__section"><summary>Spectrogram</summary><div class="analyzeSetting js-settingTabContent-spectrogram"></div></details>' +
      "</div></details>";
    this._playerSettings = new PlayerSettingsComponent(
      selector + " .js-settingTabContent-player",
      playerSettingsService,
      analyzeService,
      analyzeSettingsService,
    );
    this._analyzeSettings = new AnalyzeSettingsComponent(
      selector + " .js-settingTabContent-analyze",
      analyzeService,
      analyzeSettingsService,
      this._root,
    );
    this.moveAnalysisFieldsets();
    this._register(this._playerSettings);
    this._register(this._analyzeSettings);
  }

  private moveAnalysisFieldsets() {
    const analysisRoot = this._root.querySelector(
      ".js-settingTabContent-analyze",
    );
    const waveformRoot = this._root.querySelector(
      ".js-settingTabContent-waveform",
    );
    const spectrogramRoot = this._root.querySelector(
      ".js-settingTabContent-spectrogram",
    );
    if (!analysisRoot || !waveformRoot || !spectrogramRoot) {
      return;
    }
    for (const fieldset of Array.from(
      analysisRoot.querySelectorAll("fieldset[data-setting-section]"),
    )) {
      const section = fieldset.getAttribute("data-setting-section");
      if (section === "waveform") {
        waveformRoot.appendChild(fieldset);
      } else if (section === "spectrogram") {
        spectrogramRoot.appendChild(fieldset);
      }
    }
  }

  public dispose() {
    this._playerSettings = undefined;
    this._analyzeSettings = undefined;
    super.dispose();
  }
}
