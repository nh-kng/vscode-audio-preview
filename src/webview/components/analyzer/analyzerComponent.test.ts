import { createAudioContext } from "../../../__mocks__/helper";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import PlayerService from "../../services/playerService";
import PlayerSettingsService from "../../services/playerSettingsService";
import AnalyzerComponent from "./analyzerComponent";

describe("analyserComponent", () => {
  let audioBuffer: AudioBuffer;
  let analyzeService: AnalyzeService;
  let analyzeSettingsService: AnalyzeSettingsService;
  let analyzerComponent: AnalyzerComponent;
  beforeAll(() => {
    document.body.innerHTML = '<div id="analyzer"></div>';
    const audioContext = createAudioContext(44100);
    audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    analyzeService = new AnalyzeService(audioBuffer);
    analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const pd = {
      volumeUnitDb: true,
      initialVolumeDb: 0.0,
      initialVolume: 1.0,
      enableSpacekeyPlay: true,
      enableSeekToPlay: true,
      enableHpf: false,
      hpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_HPF_DEFAULT,
      enableLpf: false,
      lpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_LPF_DEFAULT,
      matchFilterFrequencyToSpectrogram: false,
    };
    const playerSettingsService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    const playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingsService,
    );
    analyzerComponent = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
  });

  afterAll(() => {
    analyzerComponent.dispose();
  });

  test("analyzer should have analyze-button", () => {
    const analyzeButton = document.querySelector(".analyzeButton");
    expect(analyzeButton).toBeTruthy();
    expect((analyzeButton as HTMLElement).style.display).toBe("");
    expect(
      document.querySelector(".analyzerEmptyState")?.textContent,
    ).toContain("No analysis yet");
    expect(
      document.querySelector(".analyzerEmptyState")?.textContent,
    ).toContain("Analyze this audio to view its waveform and spectrogram.");
  });

  test("figures in analyze-result-box should be created after analyze", () => {
    analyzeService.analyze();
    const figures = document
      .querySelector(".analyzeResultBox")
      ?.querySelectorAll("canvas");
    // figures: waveform+axis and spectrogram+axis for each channels
    expect(figures.length).toBe(audioBuffer.numberOfChannels * 4);
    expect(
      document.querySelector(".analyzerEmptyState")?.getAttribute("style"),
    ).toContain("display: none");
    expect(document.querySelectorAll(".figureLabel")).toHaveLength(
      audioBuffer.numberOfChannels * 2,
    );
    expect(
      (document.querySelector(".analyzeButton") as HTMLElement).style.display,
    ).toBe("none");
  });

  test("seek-bar on the figures should be created after analyze", () => {
    expect(document.querySelector(".visibleBar")).toBeTruthy();
    expect(document.querySelector(".userInputDiv")).toBeTruthy();
  });

  test("theme changes redraw the existing analysis without analyzing again", async () => {
    const analyzeSpy = jest.spyOn(analyzeService, "analyze");
    const spectrogramSpy = jest.spyOn(analyzeService, "getSpectrogram");
    analyzeSpy.mockClear();
    spectrogramSpy.mockClear();
    analyzeSettingsService.minTime = 0.2;
    analyzeSettingsService.maxTime = 0.8;
    const previousClass = document.documentElement.getAttribute("class");
    const previousCanvas = document.querySelector(".analyzeResultBox canvas");
    document.documentElement.classList.add("audio-theme-test");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(document.querySelector(".analyzeResultBox canvas")).not.toBe(
      previousCanvas,
    );
    expect(spectrogramSpy).toHaveBeenCalled();
    expect(
      spectrogramSpy.mock.calls.every(
        ([, settings]) =>
          settings.minTime === 0 && settings.maxTime === audioBuffer.duration,
      ),
    ).toBe(true);
    expect(document.querySelectorAll(".analyzeResultBox canvas")).toHaveLength(
      audioBuffer.numberOfChannels * 4,
    );
    expect(
      (document.querySelector(".analyzeButton") as HTMLElement).style.display,
    ).toBe("inline-flex");
    expect(document.querySelector(".analyzeButton span")?.textContent).toBe(
      "Reanalyze",
    );
    expect(
      document.querySelector(".analyzeButton")?.getAttribute("aria-label"),
    ).toBe("Reanalyze");
    if (previousClass === null) {
      document.documentElement.removeAttribute("class");
    } else {
      document.documentElement.setAttribute("class", previousClass);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    analyzeSpy.mockRestore();
    spectrogramSpy.mockRestore();
  });

  test("clicking Reanalyze uses current settings and clears the pending action", () => {
    const analyzeSpy = jest.spyOn(analyzeService, "analyze");
    analyzeSpy.mockClear();
    const analyzeButton = document.querySelector(
      ".analyzeButton",
    ) as HTMLButtonElement;
    analyzeButton.dispatchEvent(new Event("click"));
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(analyzeButton.style.display).toBe("none");
    expect(analyzeButton.querySelector("span")?.textContent).toBe(
      "Analyze audio",
    );
    expect(document.querySelectorAll(".analyzeResultBox canvas")).toHaveLength(
      audioBuffer.numberOfChannels * 4,
    );
    analyzeSpy.mockRestore();
  });

  test("effective analysis setting changes toggle Reanalyze", () => {
    const analyzeButton = document.querySelector(
      ".analyzeButton",
    ) as HTMLButtonElement;
    const currentMinTime = analyzeSettingsService.minTime;
    analyzeSettingsService.minTime = currentMinTime;
    expect(analyzeButton.style.display).toBe("none");

    analyzeSettingsService.waveformVisible = false;
    expect(analyzeButton.style.display).toBe("inline-flex");
    expect(analyzeButton.querySelector("span")?.textContent).toBe("Reanalyze");

    analyzeSettingsService.waveformVisible = true;
    expect(analyzeButton.style.display).toBe("none");
  });

  test("analysis with both figures hidden shows a meaningful placeholder", () => {
    const analyzeButton = document.querySelector(
      ".analyzeButton",
    ) as HTMLButtonElement;
    analyzeSettingsService.waveformVisible = false;
    analyzeSettingsService.spectrogramVisible = false;
    analyzeButton.dispatchEvent(new Event("click"));

    expect(document.querySelectorAll(".analyzeResultBox canvas")).toHaveLength(
      0,
    );
    expect(
      (document.querySelector(".analyzerEmptyState") as HTMLElement).style
        .display,
    ).toBe("block");
    expect(
      document.querySelector(".analyzerEmptyState")?.textContent,
    ).toContain("No analysis results are visible");
    expect(
      document.querySelector(".analyzerEmptyState")?.textContent,
    ).toContain("Enable Waveform or Spectrogram in Settings, then reanalyze.");
    expect(analyzeButton.style.display).toBe("none");
  });
});

describe("auto analyze", () => {
  test("analyzer should start analyze if autoAnalyze is true", () => {
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    const analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const pd = {
      volumeUnitDb: true,
      initialVolumeDb: 0.0,
      initialVolume: 1.0,
      enableSpacekeyPlay: true,
      enableSeekToPlay: true,
      enableHpf: false,
      hpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_HPF_DEFAULT,
      enableLpf: false,
      lpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_LPF_DEFAULT,
      matchFilterFrequencyToSpectrogram: false,
    };
    const playerSettingsService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    const playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingsService,
    );
    const ac = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      true,
    );
    expect(
      document.querySelector(".analyzeResultBox")?.querySelectorAll("canvas")
        .length,
    ).toBe(8);
    expect(
      (document.querySelector(".analyzeResultBox") as HTMLElement).style
        .display,
    ).toBe("block");
    expect(
      (document.querySelector(".analyzerEmptyState") as HTMLElement).style
        .display,
    ).toBe("none");
    expect(
      (document.querySelector(".analyzeButton") as HTMLElement).style.display,
    ).toBe("none");
    ac.dispose();
  });

  test("analyzer should not start analyze if autoAnalyze is false", () => {
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    const analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const pd = {
      volumeUnitDb: true,
      initialVolumeDb: 0.0,
      initialVolume: 1.0,
      enableSpacekeyPlay: true,
      enableSeekToPlay: true,
      enableHpf: false,
      hpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_HPF_DEFAULT,
      enableLpf: false,
      lpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_LPF_DEFAULT,
      matchFilterFrequencyToSpectrogram: false,
    };
    const playerSettingsService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    const playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingsService,
    );
    const ac = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
    expect(
      document.querySelector(".analyzeResultBox")?.querySelectorAll("canvas")
        .length,
    ).toBe(0);
    ac.dispose();
  });
});

describe("position of seek-bar should be updated when recieving update-seekbar event", () => {
  let analyzeSettingsService: AnalyzeSettingsService;
  let playerService: PlayerService;
  let analyzerComponent: AnalyzerComponent;

  beforeAll(() => {
    document.body.innerHTML = '<div id="analyzer"></div>';
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 441000, 44100);
    const ad = {
      waveformVisible: undefined,
      waveformVerticalScale: undefined,
      spectrogramVisible: undefined,
      spectrogramVerticalScale: undefined,
      windowSizeIndex: undefined,
      minAmplitude: undefined,
      maxAmplitude: undefined,
      minFrequency: undefined,
      maxFrequency: undefined,
      spectrogramAmplitudeRange: undefined,
      frequencyScale: undefined,
      melFilterNum: undefined,
    };
    const analyzeService = new AnalyzeService(audioBuffer);
    analyzeSettingsService = AnalyzeSettingsService.fromDefaultSetting(
      ad,
      audioBuffer,
    );
    const pd = {
      volumeUnitDb: true,
      initialVolumeDb: 0.0,
      initialVolume: 1.0,
      enableSpacekeyPlay: true,
      enableSeekToPlay: true,
      enableHpf: false,
      hpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_HPF_DEFAULT,
      enableLpf: false,
      lpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_LPF_DEFAULT,
      matchFilterFrequencyToSpectrogram: false,
    };
    const playerSettingsService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingsService,
    );
    analyzeSettingsService.minTime = 2;
    analyzeSettingsService.maxTime = 6;
    // audio: 10s, minTime: 2s, maxTime: 6s
    analyzerComponent = new AnalyzerComponent(
      "#analyzer",
      audioBuffer,
      analyzeService,
      analyzeSettingsService,
      playerService,
      false,
    );
    analyzeService.analyze();
  });

  afterAll(() => {
    analyzerComponent.dispose();
    playerService.dispose();
  });

  test("value: 50(5s), position: 75%", () => {
    const visibleSeekbar = <HTMLInputElement>(
      document.querySelector(".visibleBar")
    );
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 50,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("75%");
  });

  test("value: 5(0.5s), position: 0%", () => {
    const visibleSeekbar = <HTMLInputElement>(
      document.querySelector(".visibleBar")
    );
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 5,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("0%");
  });

  test("value: 90(9s), position: 100%", () => {
    const visibleSeekbar = <HTMLInputElement>(
      document.querySelector(".visibleBar")
    );
    playerService.dispatchEvent(
      new CustomEvent("update-seekbar", {
        detail: {
          value: 90,
        },
      }),
    );
    expect(visibleSeekbar.style.width).toBe("100%");
  });
});
