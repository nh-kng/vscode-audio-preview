import { EventType } from "../../events";
import {
  createAudioContext,
  waitEventForAction,
} from "../../../__mocks__/helper";
import PlayerService from "../../services/playerService";
import PlayerSettingsService from "../../services/playerSettingsService";
import PlayerComponent from "./playerComponent";

describe("playerComponent", () => {
  let playerService: PlayerService;
  let playerSettingService: PlayerSettingsService;
  let playerComponent: PlayerComponent;
  beforeAll(() => {
    document.body.innerHTML = '<div id="player"></div>';
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const pd = {
      volumeUnitDb: undefined,
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
    playerSettingService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingService,
    );
    playerComponent = new PlayerComponent(
      "#player",
      playerService,
      playerSettingService,
    );
  });

  afterAll(() => {
    playerComponent.dispose();
    playerService.dispose();
  });

  test("player should have play button", () => {
    expect(document.querySelector(".playButton")).toBeTruthy();
  });

  test("player should have seek bar", () => {
    expect(document.querySelector(".seekBar")).toBeTruthy();
    expect(document.querySelector(".userInputSeekBar")).toBeTruthy();
    expect(document.querySelector(".seekPosText")).toBeTruthy();
  });

  test("playback card exposes compact transport controls and timestamps", () => {
    expect(
      document.querySelector(
        '.seekButton--backward .icon[data-icon="debug-step-back"]',
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        '.seekButton--forward .icon[data-icon="debug-step-over"]',
      ),
    ).toBeTruthy();
    const playerHeader = document.querySelector(".playerHeader");
    expect(
      playerHeader?.children[0].classList.contains("playbackControls"),
    ).toBe(true);
    expect(playerHeader?.children[1].classList.contains("seekArea")).toBe(true);
    expect(
      document
        .querySelector(".seekButton--backward")
        ?.getAttribute("aria-label"),
    ).toBe("Back 5 seconds");
    expect(
      document
        .querySelector(".seekButton--forward")
        ?.getAttribute("aria-label"),
    ).toBe("Forward 5 seconds");
    expect(document.querySelector(".trackTitle")).toBeNull();
    expect(
      document.querySelector(".playerComponent")?.getAttribute("aria-label"),
    ).toBe("Audio playback");
    expect(
      document.querySelector(".playerComponent")?.textContent,
    ).not.toContain("Audio playback");
    expect(document.querySelector(".durationText")?.textContent).toBe("00:01");

    expect(document.querySelector(".volumeButton")).toBeTruthy();
    expect(
      document
        .querySelector(".volumeButton")
        ?.parentElement?.classList.contains("volumeControl"),
    ).toBe(true);
    expect(document.querySelector(".volumePopover")).toHaveProperty(
      "hidden",
      true,
    );
    expect(
      document.querySelector(".durationText")?.previousElementSibling
        ?.textContent,
    ).toBe(" / ");
  });

  test("volume popover updates percent gain and closes accessibly", () => {
    const volumeButton = document.querySelector(
      ".volumeButton",
    ) as HTMLButtonElement;
    const volumePopover = document.querySelector(
      ".volumePopover",
    ) as HTMLElement;
    const volumeBar = document.querySelector(".volumeBar") as HTMLInputElement;

    expect(volumeBar.value).toBe("100");
    expect(playerService.volume).toBe(1);
    volumeButton.click();
    expect(volumePopover.hidden).toBe(false);
    expect(volumeButton.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(volumeBar);

    volumeBar.value = "25";
    volumeBar.dispatchEvent(new Event(EventType.INPUT));
    expect(playerService.volume).toBe(0.25);
    expect(volumeButton.getAttribute("aria-label")).toBe("Volume 25%");

    window.dispatchEvent(
      new KeyboardEvent(EventType.KEY_DOWN, { key: "Escape" }),
    );
    expect(volumePopover.hidden).toBe(true);
    expect(volumeButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(volumeButton);
  });

  test("volume popover closes when a playback sibling is clicked", () => {
    const volumeButton = document.querySelector(
      ".volumeButton",
    ) as HTMLButtonElement;
    const volumePopover = document.querySelector(
      ".volumePopover",
    ) as HTMLElement;
    volumeButton.click();
    expect(volumePopover.hidden).toBe(false);

    document
      .querySelector(".seekButton--forward")
      ?.dispatchEvent(new MouseEvent(EventType.MOUSE_DOWN, { bubbles: true }));
    expect(volumePopover.hidden).toBe(true);
  });

  test("volume preserves dB initialization and updates the gain", () => {
    const root = document.createElement("div");
    root.id = "playerDb";
    document.body.appendChild(root);
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const settings = PlayerSettingsService.fromDefaultSetting(
      {
        volumeUnitDb: true,
        initialVolumeDb: -6,
        initialVolume: 1,
      } as Parameters<typeof PlayerSettingsService.fromDefaultSetting>[0],
      audioBuffer,
    );
    const service = new PlayerService(audioContext, audioBuffer, settings);
    const component = new PlayerComponent("#playerDb", service, settings);
    const volumeBar = root.querySelector(".volumeBar") as HTMLInputElement;
    const volumeText = root.querySelector(".volumeText") as HTMLElement;

    expect(volumeBar.value).toBe("-6");
    expect(volumeText.textContent).toContain("50%");
    expect(service.volume).toBeCloseTo(Math.pow(10, -6 / 20));
    volumeBar.value = "-80";
    volumeBar.dispatchEvent(new Event(EventType.INPUT));
    expect(service.volume).toBe(0);
    expect(
      root
        .querySelector(".volumeButton .volumeIcon")
        ?.getAttribute("data-icon"),
    ).toBe("mute");

    component.dispose();
    service.dispose();
    settings.dispose();
    root.remove();
  });

  test("skip controls clamp to the duration without starting paused audio", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    const forwardButton = document.querySelector(
      ".seekButton--forward",
    ) as HTMLButtonElement;
    const backButton = document.querySelector(
      ".seekButton--backward",
    ) as HTMLButtonElement;

    forwardButton.click();
    expect(playerService.currentSec).toBe(1);
    expect(playerService.isPlaying).toBe(false);
    expect(document.querySelector(".seekPosText")?.textContent).toBe("00:01");

    backButton.click();
    expect(playerService.currentSec).toBe(0);
    expect(document.querySelector(".seekPosText")?.textContent).toBe("00:00");
  });

  test("seek bar should expose one accessible interactive slider", () => {
    const seekBars = document.querySelectorAll('input[type="range"].seekBar');
    expect(seekBars).toHaveLength(1);
    expect(seekBars[0]).toBe(document.querySelector(".userInputSeekBar"));
    expect(seekBars[0].getAttribute("aria-label")).toContain("Seek position");
  });

  test("dispatch update-seekbar event when user change user-input-seek-bar", async () => {
    const detail = await waitEventForAction(
      () => {
        const userinputSeekbar = <HTMLInputElement>(
          document.querySelector(".userInputSeekBar")
        );
        userinputSeekbar.value = "50";
        userinputSeekbar.dispatchEvent(new Event("change"));
      },
      playerService,
      EventType.UPDATE_SEEKBAR,
    );
    expect(detail.value).toBeGreaterThanOrEqual(50);
  });

  test("does not overwrite a seek value while the user is editing", () => {
    const seekBar = document.querySelector(".seekBar") as HTMLInputElement;
    seekBar.value = "100";
    seekBar.dispatchEvent(new Event(EventType.INPUT));
    expect(document.querySelector(".seekPosText")?.textContent).toBe("00:01");
    playerService.dispatchEvent(
      new CustomEvent(EventType.UPDATE_SEEKBAR, {
        detail: { value: 0, pos: 0 },
      }),
    );
    expect(seekBar.value).toBe("100");
    expect(document.querySelector(".seekPosText")?.textContent).toBe("00:01");
    seekBar.dispatchEvent(new Event(EventType.CHANGE));
    if (playerService.isPlaying) {
      playerService.pause();
    }
  });

  test("update visible-seekbar when seekbar value is updated", () => {
    const visibleSeekbar = <HTMLInputElement>document.querySelector(".seekBar");
    playerService.dispatchEvent(
      new CustomEvent(EventType.UPDATE_SEEKBAR, {
        detail: {
          value: 50,
        },
      }),
    );
    expect(visibleSeekbar.value).toBe("50");
  });

  test("play when play button is clicked while not playing", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    const playButton = <HTMLButtonElement>document.querySelector(".playButton");
    playButton.dispatchEvent(new Event("click"));
    expect(playerService.isPlaying).toBe(true);
  });

  test("pause when play button is clicked while playing", () => {
    playerService.play();
    const playButton = <HTMLButtonElement>document.querySelector(".playButton");
    playButton.dispatchEvent(new Event("click"));
    expect(playerService.isPlaying).toBe(false);
  });

  test("change play icon when playing status is updated", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    const playButton = <HTMLButtonElement>document.querySelector(".playButton");
    const playIcon = playButton.querySelector(".playIcon");
    expect(playIcon?.getAttribute("data-icon")).toBe("play");
    playerService.play();
    expect(playIcon?.getAttribute("data-icon")).toBe("debug-pause");
  });

  test("play when space key is pressed while not playing (enableSpacekeyPlay = true)", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    window.dispatchEvent(
      new KeyboardEvent("keydown", { isComposing: false, code: "Space" }),
    );
    expect(playerService.isPlaying).toBe(true);
  });

  test("do not play when space key is pressed while not playing (enableSpacekeyPlay = false)", () => {
    const player2 = document.createElement("div");
    player2.id = "player2";
    document.body.appendChild(player2);
    const audioContext = createAudioContext(44100);
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const pd = {
      volumeUnitDb: true,
      initialVolumeDb: 0.0,
      initialVolume: 1.0,
      enableSpacekeyPlay: false,
      enableSeekToPlay: true,
      enableHpf: false,
      hpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_HPF_DEFAULT,
      enableLpf: false,
      lpfFrequency: PlayerSettingsService.FILTER_FREQUENCY_LPF_DEFAULT,
      matchFilterFrequencyToSpectrogram: false,
    };
    const playerSettingService = PlayerSettingsService.fromDefaultSetting(
      pd,
      audioBuffer,
    );
    const playerService = new PlayerService(
      audioContext,
      audioBuffer,
      playerSettingService,
    );
    const playerComponent = new PlayerComponent(
      "#player2",
      playerService,
      playerSettingService,
    );

    window.dispatchEvent(
      new KeyboardEvent("keydown", { isComposing: false, code: "Space" }),
    );
    expect(playerService.isPlaying).toBe(false);

    playerService.dispose();
    playerComponent.dispose();
    document.body.removeChild(player2);
  });

  test("do not toggle playback when space is pressed while editing a control", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    const seekBar = document.querySelector(".seekBar") as HTMLInputElement;
    seekBar.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        isComposing: false,
        code: "Space",
      }),
    );
    expect(playerService.isPlaying).toBe(false);
  });

  test("do not toggle playback from a nested native control target", () => {
    if (playerService.isPlaying) {
      playerService.pause();
    }
    const playButton = document.querySelector(
      ".playButton",
    ) as HTMLButtonElement;
    const icon = document.createElement("span");
    playButton.appendChild(icon);
    icon.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        isComposing: false,
        code: "Space",
      }),
    );
    expect(playerService.isPlaying).toBe(false);
  });

  test("dispose pauses active playback", () => {
    playerService.play();
    expect(playerService.isPlaying).toBe(true);
    playerComponent.dispose();
    expect(playerService.isPlaying).toBe(false);
  });
});
