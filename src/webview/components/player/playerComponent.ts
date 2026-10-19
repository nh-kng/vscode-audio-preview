import "./playerComponent.css";
import { EventType } from "../../events";
import Component from "../../component";
import PlayerService from "../../services/playerService";
import PlayerSettingsService from "../../services/playerSettingsService";
import { iconMarkup, setIcon } from "../../icons";

export const skipSeconds = 5;

export function formatTime(seconds: number, duration = 0): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const total = Math.floor(safe);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  if (duration >= 3600 || hours > 0) {
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      secs
    );
  }
  return String(minutes).padStart(2, "0") + ":" + secs;
}

function updateRangeProgress(input: HTMLInputElement): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const progress =
    Number.isFinite(min) && Number.isFinite(max) && max > min
      ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
      : 0;
  input.style.setProperty("--range-progress", progress + "%");
}

export default class PlayerComponent extends Component {
  private _root: HTMLElement;
  private _playButton: HTMLButtonElement;
  private _service: PlayerService;
  private _settings: PlayerSettingsService;

  constructor(
    selector: string,
    playerService: PlayerService,
    playerSettingsService: PlayerSettingsService,
    filename?: string,
  ) {
    super();
    this._root = document.querySelector(selector);
    this._service = playerService;
    this._settings = playerSettingsService;
    this._root.innerHTML =
      '<section class="playerComponent" aria-label="Audio playback">' +
      '<div class="playerHeader"><div class="playbackControls" aria-label="Playback controls">' +
      '<button type="button" class="seekButton seekButton--backward" aria-label="Back 5 seconds" title="Back 5 seconds">' +
      iconMarkup("debug-step-back", "controlIcon") +
      "</button>" +
      '<button type="button" class="playButton" aria-label="Play audio" aria-pressed="false">' +
      iconMarkup("play", "playIcon") +
      "</button>" +
      '<button type="button" class="seekButton seekButton--forward" aria-label="Forward 5 seconds" title="Forward 5 seconds">' +
      iconMarkup("debug-step-over", "controlIcon") +
      "</button></div>" +
      '<div class="seekArea"><div class="seekControl"><label class="srOnly" for="seekBar">Seek position</label>' +
      '<input type="range" id="seekBar" class="seekBar userInputSeekBar inputSeekBar" value="0" min="0" max="100" step="0.1" aria-label="Seek position, percentage through audio"></div>' +
      '<div class="seekLabels" aria-label="Playback time"><span class="seekPosText" role="status" aria-live="polite">00:00</span><span aria-hidden="true"> / </span><span class="durationText"></span></div></div>' +
      '<div class="volumeControl"><button type="button" class="volumeButton" aria-label="Volume" aria-controls="volumePopover" aria-expanded="false" aria-haspopup="dialog" title="Volume">' +
      iconMarkup("unmute", "volumeIcon") +
      '</button><div id="volumePopover" class="volumePopover" role="dialog" aria-label="Volume" hidden>' +
      '<label class="volumeLabel" for="volumeBar"><span class="volumeMeta"><span class="volumeText">Volume</span><span class="volumeIcon volumeIcon--popover" aria-hidden="true"></span></span>' +
      '<input id="volumeBar" class="volumeBar" type="range" aria-label="Volume"></label></div></div></div></section>';
    const playback = this._root.querySelector(
      ".playerComponent",
    ) as HTMLElement;
    if (filename?.trim()) {
      playback.setAttribute("aria-label", filename.trim());
    }
    const seek = this._root.querySelector(".seekBar") as HTMLInputElement;
    const current = this._root.querySelector(".seekPosText") as HTMLElement;
    const duration = this._root.querySelector(".durationText") as HTMLElement;
    current.textContent = formatTime(0, this._service.duration);
    duration.textContent = formatTime(
      this._service.duration,
      this._service.duration,
    );
    let seeking = false;
    this._addEventlistener(seek, EventType.INPUT, () => {
      seeking = true;
      updateRangeProgress(seek);
      current.textContent = formatTime(
        (Number(seek.value) / 100) * this._service.duration,
        this._service.duration,
      );
    });
    this._addEventlistener(seek, EventType.CHANGE, () => {
      seeking = false;
      this._service.onSeekbarInput(Number(seek.value));
    });
    this._addEventlistener(
      this._service,
      EventType.UPDATE_SEEKBAR,
      (e: CustomEventInit) => {
        if (!seeking && Number.isFinite(Number(e.detail?.value))) {
          seek.value = String(e.detail.value);
          updateRangeProgress(seek);
        }
        if (!seeking && Number.isFinite(Number(e.detail?.pos))) {
          current.textContent = formatTime(
            Number(e.detail.pos),
            this._service.duration,
          );
        }
      },
    );
    updateRangeProgress(seek);

    const volumeButton = this._root.querySelector(
      ".volumeButton",
    ) as HTMLButtonElement;
    const volumeControl = this._root.querySelector(
      ".volumeControl",
    ) as HTMLElement;
    const volumePopover = this._root.querySelector(
      ".volumePopover",
    ) as HTMLElement;
    const volumeBar = this._root.querySelector(
      ".volumeBar",
    ) as HTMLInputElement;
    const volumeText = this._root.querySelector(".volumeText") as HTMLElement;
    const volumeIcons = this._root.querySelectorAll(".volumeIcon");
    if (this._settings.volumeUnitDb) {
      volumeBar.min = "-80";
      volumeBar.max = "0";
      volumeBar.step = "0.5";
      volumeBar.value = String(this._settings.initialVolumeDb);
    } else {
      volumeBar.min = "0";
      volumeBar.max = "100";
      volumeBar.step = "1";
      volumeBar.value = String(this._settings.initialVolume * 100);
    }
    const updateVolume = () => {
      let icon: "mute" | "unmute";
      if (this._settings.volumeUnitDb) {
        const db = Number(volumeBar.value);
        const linear = db === -80 ? 0 : Math.pow(10, db / 20);
        this._service.volume = linear;
        volumeText.textContent =
          "Volume " +
          Math.round(linear * 100) +
          "% · " +
          (linear === 0 ? "muted" : db.toFixed(1) + " dB");
        icon = linear === 0 ? "mute" : "unmute";
      } else {
        const percent = Number(volumeBar.value);
        this._service.volume = percent / 100;
        volumeText.textContent = "Volume " + percent + "%";
        icon = percent === 0 ? "mute" : "unmute";
      }
      volumeIcons.forEach((element) => setIcon(element as HTMLElement, icon));
      volumeButton.setAttribute("aria-label", volumeText.textContent);
      volumeButton.setAttribute("title", volumeText.textContent);
      updateRangeProgress(volumeBar);
    };
    this._addEventlistener(volumeBar, EventType.INPUT, updateVolume);
    updateVolume();

    const setVolumePopoverOpen = (open: boolean, focusSlider = false) => {
      volumePopover.hidden = !open;
      volumeButton.setAttribute("aria-expanded", String(open));
      if (open && focusSlider) {
        volumeBar.focus();
      }
    };
    this._addEventlistener(volumeButton, EventType.CLICK, () => {
      setVolumePopoverOpen(volumePopover.hidden, true);
    });
    const closeVolumePopoverOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (target && !volumeControl.contains(target)) {
        setVolumePopoverOpen(false);
      }
    };
    this._addEventlistener(
      document,
      EventType.MOUSE_DOWN,
      closeVolumePopoverOutside,
    );
    this._addEventlistener(
      document,
      EventType.CLICK,
      closeVolumePopoverOutside,
    );
    this._addEventlistener(
      window,
      EventType.KEY_DOWN,
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && !volumePopover.hidden) {
          event.preventDefault();
          setVolumePopoverOpen(false);
          volumeButton.focus();
        }
      },
    );

    this._playButton = this._root.querySelector(".playButton");
    const updateButton = () => {
      const playing = this._service.isPlaying;
      setIcon(
        this._playButton.querySelector(".playIcon") as HTMLElement,
        playing ? "debug-pause" : "play",
      );
      this._playButton.setAttribute(
        "aria-label",
        playing ? "Pause audio" : "Play audio",
      );
      this._playButton.setAttribute(
        "title",
        playing ? "Pause audio" : "Play audio",
      );
      this._playButton.setAttribute("aria-pressed", String(playing));
      this._playButton.classList.toggle("isPlaying", playing);
    };
    this._addEventlistener(this._playButton, EventType.CLICK, () =>
      playingToggle(this._service),
    );
    this._addEventlistener(
      this._service,
      EventType.UPDATE_IS_PLAYING,
      updateButton,
    );
    updateButton();
    this._addEventlistener(
      this._root.querySelector(".seekButton--backward"),
      EventType.CLICK,
      () => this._service.seekBy(-skipSeconds),
    );
    this._addEventlistener(
      this._root.querySelector(".seekButton--forward"),
      EventType.CLICK,
      () => this._service.seekBy(skipSeconds),
    );
    this._addEventlistener(
      window,
      EventType.KEY_DOWN,
      (event: KeyboardEvent) => {
        if (!this._settings.enableSpacekeyPlay) {
          return;
        }
        const target = event.target as HTMLElement | null;
        if (
          event.isComposing ||
          event.code !== "Space" ||
          target?.closest?.(
            "button, a, input, textarea, select, summary, [contenteditable]",
          )
        ) {
          return;
        }
        event.preventDefault();
        this._playButton.click();
      },
    );
  }

  public dispose() {
    if (this._service.isPlaying) {
      this._service.pause();
    }
    super.dispose();
  }
}

function playingToggle(service: PlayerService) {
  if (service.isPlaying) {
    service.pause();
  } else {
    service.play();
  }
}
