import { createAudioContext } from "../../../__mocks__/helper";
import { AnalyzeDefault, PlayerDefault } from "../../../config";
import AnalyzeService from "../../services/analyzeService";
import AnalyzeSettingsService from "../../services/analyzeSettingsService";
import AudioSelectionService from "../../services/audioSelectionService";
import PlayerService from "../../services/playerService";
import PlayerSettingsService from "../../services/playerSettingsService";
import FigureInteractionComponent from "./figureInteractionComponent";

describe("figureInteractionComponent", () => {
  test("plain drag selects shared time across charts without analysis", () => {
    document.body.innerHTML =
      '<div id="waveform"></div><div id="spectrogram"></div>';
    const context = createAudioContext(100);
    const buffer = context.createBuffer(1, 1000, 100);
    const playerSettings = PlayerSettingsService.fromDefaultSetting(
      {} as PlayerDefault,
      buffer,
    );
    const player = new PlayerService(context, buffer, playerSettings);
    const analyze = new AnalyzeService(buffer);
    const settings = AnalyzeSettingsService.fromDefaultSetting(
      {} as AnalyzeDefault,
      buffer,
    );
    const waveformSettings = settings.toProps();
    const spectrogramSettings = settings.toProps();
    const analyzeSpy = jest.spyOn(analyze, "analyze");
    const selection = new AudioSelectionService(buffer.duration);
    const waveform = new FigureInteractionComponent(
      "#waveform",
      true,
      player,
      analyze,
      settings,
      buffer,
      waveformSettings,
      selection,
    );
    const spectrogram = new FigureInteractionComponent(
      "#spectrogram",
      false,
      player,
      analyze,
      settings,
      buffer,
      spectrogramSettings,
      selection,
    );
    const waveformInput = document.querySelector(
      "#waveform .userInputDiv",
    ) as HTMLElement;
    const spectrogramInput = document.querySelector(
      "#spectrogram .userInputDiv",
    ) as HTMLElement;
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    Object.defineProperty(waveformInput, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
    Object.defineProperty(spectrogramInput, "getBoundingClientRect", {
      value: () => rect,
    });

    waveformInput.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, clientX: 70, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 30, clientY: 40 }),
    );
    expect(
      (document.querySelector("#waveform .selectionOverlay") as HTMLElement)
        .style.display,
    ).toBe("block");
    expect(
      (document.querySelector("#spectrogram .selectionOverlay") as HTMLElement)
        .style.display,
    ).toBe("block");
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 30, clientY: 40 }),
    );

    expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
    expect(analyzeSpy).not.toHaveBeenCalled();

    const startHandle = document.querySelector(
      "#waveform .selectionHandle--start",
    ) as HTMLButtonElement;
    const endHandle = document.querySelector(
      "#waveform .selectionHandle--end",
    ) as HTMLButtonElement;
    expect(startHandle.style.display).toBe("block");
    expect(endHandle.style.display).toBe("block");
    startHandle.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, clientX: 30, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 10, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 10, clientY: 40 }),
    );
    expect(selection.selection).toEqual({ startSeconds: 1, endSeconds: 7 });
    expect(
      (document.querySelector("#spectrogram .selectionOverlay") as HTMLElement)
        .style.left,
    ).toBe("10%");

    endHandle.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, clientX: 70, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 90, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 90, clientY: 40 }),
    );
    expect(selection.selection).toEqual({ startSeconds: 1, endSeconds: 9 });

    endHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(selection.selection).toEqual({ startSeconds: 1, endSeconds: 8.9 });

    waveformSettings.minTime = 2;
    waveformSettings.maxTime = 8;
    selection.setSelection(1, 9);
    expect(startHandle.style.display).toBe("none");
    expect(endHandle.style.display).toBe("none");
    selection.setSelection(2, 8);
    expect(startHandle.style.display).toBe("block");
    expect(endHandle.style.display).toBe("block");

    selection.clearSelection();
    expect(
      (document.querySelector("#waveform .selectionOverlay") as HTMLElement)
        .style.display,
    ).toBe("none");
    expect(
      (document.querySelector("#spectrogram .selectionOverlay") as HTMLElement)
        .style.display,
    ).toBe("none");
    waveform.dispose();
    spectrogram.dispose();
    player.dispose();
    analyze.dispose();
    settings.dispose();
    selection.dispose();
  });

  test("modifier drags zoom the requested axis and are disposed cleanly", () => {
    document.body.innerHTML = '<div id="figure"></div>';
    const context = createAudioContext(100);
    const buffer = context.createBuffer(1, 1000, 100);
    const playerSettings = PlayerSettingsService.fromDefaultSetting(
      {} as PlayerDefault,
      buffer,
    );
    const player = new PlayerService(context, buffer, playerSettings);
    const analyze = new AnalyzeService(buffer);
    const analyzeSpy = jest.spyOn(analyze, "analyze");
    const settings = AnalyzeSettingsService.fromDefaultSetting(
      {} as AnalyzeDefault,
      buffer,
    );
    const selection = new AudioSelectionService(buffer.duration);
    const component = new FigureInteractionComponent(
      "#figure",
      true,
      player,
      analyze,
      settings,
      buffer,
      settings.toProps(),
      selection,
    );
    const input = document.querySelector(".userInputDiv") as HTMLElement;
    Object.defineProperty(input, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });

    input.dispatchEvent(
      new MouseEvent("mousedown", {
        button: 0,
        clientX: 10,
        clientY: 40,
        ctrlKey: true,
      }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 60, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 60, clientY: 40 }),
    );
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(settings.minTime).toBeCloseTo(1);
    expect(settings.maxTime).toBeCloseTo(6);
    expect(selection.hasSelection).toBe(false);

    component.dispose();
    input.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, clientX: 70, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 30, clientY: 40 }),
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 30, clientY: 40 }),
    );
    expect(selection.hasSelection).toBe(false);
    player.dispose();
    analyze.dispose();
    settings.dispose();
    selection.dispose();
  });

  test("click seeking keeps the current selection overlay stable", () => {
    document.body.innerHTML = '<div id="figure"></div>';
    const context = createAudioContext(100);
    const buffer = context.createBuffer(1, 1000, 100);
    const playerSettings = PlayerSettingsService.fromDefaultSetting(
      {} as PlayerDefault,
      buffer,
    );
    const player = new PlayerService(context, buffer, playerSettings);
    const analyze = new AnalyzeService(buffer);
    const settings = AnalyzeSettingsService.fromDefaultSetting(
      {} as AnalyzeDefault,
      buffer,
    );
    const selection = new AudioSelectionService(buffer.duration);
    const component = new FigureInteractionComponent(
      "#figure",
      true,
      player,
      analyze,
      settings,
      buffer,
      settings.toProps(),
      selection,
    );
    const input = document.querySelector(".userInputDiv") as HTMLElement;
    const overlay = document.querySelector(".selectionOverlay") as HTMLElement;
    Object.defineProperty(input, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
    selection.setSelection(3, 7);

    const modifiers: Array<{ ctrlKey?: boolean; shiftKey?: boolean }> = [
      {},
      { ctrlKey: true },
      { shiftKey: true },
    ];
    for (const modifier of modifiers) {
      input.dispatchEvent(
        new MouseEvent("mousedown", {
          button: 0,
          clientX: 85,
          clientY: 40,
          ...modifier,
        }),
      );
      expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
      expect({
        display: overlay.style.display,
        left: overlay.style.left,
        width: overlay.style.width,
        top: overlay.style.top,
        height: overlay.style.height,
      }).toEqual({
        display: "block",
        left: "30%",
        width: "40%",
        top: "0px",
        height: "100%",
      });

      window.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 86, clientY: 40 }),
      );
      expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
      expect(overlay.style.display).toBe("block");
      expect(overlay.style.left).toBe("30%");
      expect(overlay.style.width).toBe("40%");

      window.dispatchEvent(
        new MouseEvent("mouseup", { clientX: 86, clientY: 40 }),
      );
      expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
      expect(overlay.style.display).toBe("block");
      expect(overlay.style.left).toBe("30%");
      expect(overlay.style.width).toBe("40%");
      expect(player.currentSec).toBeCloseTo(8.6);
    }

    input.dispatchEvent(
      new MouseEvent("mousedown", {
        button: 0,
        clientX: 50,
        clientY: 40,
        ctrlKey: true,
      }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 50, clientY: 80 }),
    );
    expect(overlay.style.width).toBe("0px");
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 50, clientY: 80 }),
    );
    expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
    expect(overlay.style.display).toBe("block");
    expect(overlay.style.left).toBe("30%");
    expect(overlay.style.width).toBe("40%");

    input.dispatchEvent(
      new MouseEvent("mousedown", {
        button: 0,
        clientX: 50,
        clientY: 40,
        shiftKey: true,
      }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 80, clientY: 40 }),
    );
    expect(overlay.style.height).toBe("0px");
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 80, clientY: 40 }),
    );
    expect(selection.selection).toEqual({ startSeconds: 3, endSeconds: 7 });
    expect(overlay.style.display).toBe("block");
    expect(overlay.style.left).toBe("30%");
    expect(overlay.style.width).toBe("40%");

    component.dispose();
    player.dispose();
    analyze.dispose();
    settings.dispose();
    selection.dispose();
  });
});
