import * as vscode from "vscode";
import { AudioPreviewEditorProvider } from "./audioPreviewEditor";
import { WebviewMessage, WebviewMessageType } from "./message";

jest.mock(
  "vscode",
  () => {
    class MockUri {
      public readonly scheme = "file";
      public readonly path: string;
      public readonly fsPath: string;

      public constructor(path: string) {
        this.path = path;
        this.fsPath = path;
      }

      public static file(path: string) {
        return new MockUri(path);
      }

      public static parse(value: string) {
        return new MockUri(value.replace(/^file:\/\//, ""));
      }

      public static joinPath(base: MockUri, ...parts: string[]) {
        const segments = (base.path + "/" + parts.join("/"))
          .split("/")
          .filter(Boolean);
        const normalized: string[] = [];
        for (const segment of segments) {
          if (segment === "..") {
            normalized.pop();
          } else if (segment !== ".") {
            normalized.push(segment);
          }
        }
        return new MockUri("/" + normalized.join("/"));
      }
    }

    const showSaveDialog = jest.fn();
    const writeFile = jest.fn();
    const workspaceFolder = { uri: new MockUri("/workspace") };
    return {
      ["Uri"]: MockUri,
      window: {
        showSaveDialog,
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        registerCustomEditorProvider: jest.fn(),
      },
      workspace: {
        isTrusted: true,
        fs: { writeFile },
        getWorkspaceFolder: jest.fn(() => workspaceFolder),
        getConfiguration: jest.fn(() => ({ get: jest.fn() })),
      },
      ["__test"]: { showSaveDialog, writeFile },
    };
  },
  { virtual: true },
);

interface VscodeTestHooks {
  showSaveDialog: jest.Mock;
  writeFile: jest.Mock;
}

const hooks = (vscode as typeof vscode & { ["__test"]: VscodeTestHooks })[
  "__test"
];

describe("AudioPreviewEditorProvider WAV export", () => {
  const document = {
    uri: vscode.Uri.file("/workspace/source.wav"),
  } as unknown as vscode.CustomDocument;
  const panel = {} as vscode.WebviewPanel;
  const message: WebviewMessage = {
    type: WebviewMessageType.WRITE_WAV,
    data: {
      filename: "source_selection.wav",
      samples: new Uint8Array([1, 2, 3, 4]).buffer,
    },
  };

  beforeEach(() => {
    hooks.showSaveDialog.mockReset();
    hooks.writeFile.mockReset();
  });

  async function handleWrite() {
    const provider = new AudioPreviewEditorProvider(
      {} as vscode.ExtensionContext,
    );
    await (
      provider as unknown as {
        onReceiveMessage(
          msg: WebviewMessage,
          webviewPanel: vscode.WebviewPanel,
          customDocument: vscode.CustomDocument,
        ): Promise<void>;
      }
    ).onReceiveMessage(message, panel, document);
  }

  test("cancel leaves the selection data unwritten", async () => {
    hooks.showSaveDialog.mockResolvedValue(undefined);

    await handleWrite();

    expect(hooks.showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        saveLabel: "Export Selection",
        defaultUri: expect.objectContaining({
          fsPath: "/workspace/source_selection.wav",
        }),
      }),
    );
    expect(hooks.writeFile).not.toHaveBeenCalled();
  });

  test("writes the selected bytes to the chosen URI", async () => {
    const chosenUri = vscode.Uri.file("/exports/chosen.wav");
    hooks.showSaveDialog.mockResolvedValue(chosenUri);

    await handleWrite();

    expect(hooks.writeFile).toHaveBeenCalledWith(
      chosenUri,
      expect.any(Uint8Array),
    );
    const written = hooks.writeFile.mock.calls[0][1] as Uint8Array;
    expect(Array.from(written)).toEqual([1, 2, 3, 4]);
  });
});
