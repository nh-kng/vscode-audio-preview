import { MockAudioBuffer } from "../../../__mocks__/helper";
import { AnalyzeDefault, PlayerDefault } from "../../../config";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import PlayerSettingsService from "../../services/playerSettingsService";
import SettingTab from "./settingTabComponent";

describe("settingTabComponent", () => {
  let playerSettingService: PlayerSettingsService;
  let analyzeService: AnalyzeService;
  let analyzeSettingsService: AnalyzeSettingsService;
  let settingTabComponent: SettingTab;
  beforeAll(() => {
    document.body.innerHTML = '<div id="settingTab"></div>';
    const audioBuffer = new MockAudioBuffer(
      44100,
      1,
      44100,
    ) as unknown as AudioBuffer;
    analyzeService = new AnalyzeService(audioBuffer);
    const analyzeDefault = {} as AnalyzeDefault;
    analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      analyzeDefault,
      audioBuffer,
    );
    const playerDefault = {} as PlayerDefault;
    playerSettingService = PlayerSettingsService.fromDefaultSetting(
      playerDefault,
      audioBuffer,
    );
    settingTabComponent = new SettingTab(
      "#settingTab",
      playerSettingService,
      analyzeService,
      analyzeSettingsService,
      audioBuffer,
    );
  });

  afterAll(() => {
    analyzeService.dispose();
    analyzeSettingsService.dispose();
    settingTabComponent.dispose();
  });

  test("settings is a collapsed container with four collapsed sections", () => {
    const settings = document.querySelector(
      ".settingTab",
    ) as HTMLDetailsElement;
    expect(settings.open).toBe(false);
    expect(
      Array.from(document.querySelectorAll(".settingTab__section > summary")),
    ).toHaveLength(4);
    for (const section of document.querySelectorAll(".settingTab__section")) {
      expect((section as HTMLDetailsElement).open).toBe(false);
    }
  });

  test("fieldsets are placed in their matching accordion sections", () => {
    const sections = [
      [".js-settingTabContent-player", "Playback Filters", "playbackFilters"],
      [".js-settingTabContent-analyze", "Analysis", "analysis"],
      [".js-settingTabContent-waveform", "Waveform", "waveform"],
      [".js-settingTabContent-spectrogram", "Spectrogram", "spectrogram"],
    ] as const;
    for (const [selector, summary, section] of sections) {
      expect(
        document
          .querySelector(`${selector}`)
          ?.parentElement?.querySelector(":scope > summary")?.textContent,
      ).toBe(summary);
      expect(
        document.querySelector(
          `${selector} fieldset[data-setting-section="${section}"]`,
        ),
      ).toBeTruthy();
    }
    expect(document.querySelectorAll(".settingTab legend")).toHaveLength(0);
    expect(
      document.querySelector(
        ".js-settingTabContent-waveform .js-analyzeSetting-waveformVisible",
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        ".js-settingTabContent-spectrogram .js-analyzeSetting-spectrogramVisible",
      ),
    ).toBeTruthy();
    expect(document.querySelector(".js-settingTabButton-player")).toBeNull();
    expect(document.querySelector(".js-settingTabContent-easyCut")).toBeNull();
  });
});
