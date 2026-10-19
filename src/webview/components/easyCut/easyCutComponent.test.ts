import { MockAudioBuffer } from "../../../__mocks__/helper";
import { WebviewMessageType } from "../../../message";
import AudioSelectionService from "../../services/audioSelectionService";
import EasyCutComponent from "./easyCutComponent";

describe("easyCutComponent", () => {
  test("shows a formatted selection and exports floored samples for every channel", () => {
    document.body.innerHTML = '<div id="selection"></div>';
    const buffer = new MockAudioBuffer(2, 100, 100) as unknown as AudioBuffer;
    buffer.getChannelData(0).fill(0.25);
    buffer.getChannelData(1).fill(-0.25);
    const selection = new AudioSelectionService(buffer.duration);
    const messages: unknown[] = [];
    const component = new EasyCutComponent(
      "#selection",
      buffer,
      selection,
      (message) => messages.push(message),
    );

    selection.setSelection(0.121, 0.679);
    expect(document.querySelector(".easyCut")?.hasAttribute("hidden")).toBe(
      false,
    );
    expect(document.querySelector(".easyCut__summary")?.textContent).toBe(
      "Selection: 00:00.1 – 00:00.7 (0.6s)",
    );

    (
      document.querySelector(".easyCut__button--export") as HTMLButtonElement
    ).click();
    expect(messages).toHaveLength(1);
    expect((messages[0] as { type: string }).type).toBe(
      WebviewMessageType.WRITE_WAV,
    );
    expect((messages[0] as { data: { filename: string } }).data.filename).toBe(
      "audio_selection.wav",
    );
    const samples = (messages[0] as { data: { samples: ArrayBuffer } }).data
      .samples;
    expect(new Uint8Array(samples).byteLength).toBe(44 + 55 * 2 * 2);

    component.dispose();
    selection.dispose();
  });

  test("uses an edited safe filename and keeps it while the selection changes", () => {
    document.body.innerHTML = '<div id="selection"></div>';
    const buffer = new MockAudioBuffer(1, 100, 100) as unknown as AudioBuffer;
    const selection = new AudioSelectionService(buffer.duration);
    const messages: unknown[] = [];
    const component = new EasyCutComponent(
      "#selection",
      buffer,
      selection,
      (message) => messages.push(message),
      "voice.mp3",
    );
    const filenameInput = document.querySelector(
      ".easyCut__filenameInput",
    ) as HTMLInputElement;
    filenameInput.value = "take: one";
    selection.setSelection(0.1, 0.5);
    selection.setSelection(0.2, 0.6);

    expect(filenameInput.value).toBe("take: one");
    (
      document.querySelector(".easyCut__button--export") as HTMLButtonElement
    ).click();
    expect((messages[0] as { data: { filename: string } }).data.filename).toBe(
      "take_ one.wav",
    );

    component.dispose();
    selection.dispose();
  });

  test("uses hour timestamps and restores focus when cleared", () => {
    document.body.innerHTML =
      '<div class="analyzerComponent"><div class="analyzerHeader"><button class="analyzeButton">Analyze</button></div><div id="selection"></div></div>';
    const buffer = new MockAudioBuffer(
      1,
      400000,
      100,
    ) as unknown as AudioBuffer;
    const selection = new AudioSelectionService(buffer.duration);
    const component = new EasyCutComponent(
      "#selection",
      buffer,
      selection,
      () => undefined,
    );
    selection.setSelection(3661.2, 3665.8);
    expect(document.querySelector(".easyCut__summary")?.textContent).toBe(
      "Selection: 01:01:01.2 – 01:01:05.8 (4.6s)",
    );

    (
      document.querySelector(".easyCut__button--clear") as HTMLButtonElement
    ).click();
    expect(document.querySelector(".easyCut")?.hasAttribute("hidden")).toBe(
      true,
    );
    expect(document.activeElement).toBe(
      document.querySelector(".analyzeButton"),
    );
    component.dispose();
    selection.dispose();
  });
});
