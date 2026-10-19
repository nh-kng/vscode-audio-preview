# Audio Waveform Preview

Preview and inspect audio files without leaving VS Code. Audio Waveform Preview includes playback controls, audio metadata, waveform and spectrogram analysis, and tools for selecting and exporting a section of audio.

[Install Audio Waveform Preview from the Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=nh-kng.audio-waveform-preview)

Supported file extensions:

`wav` · `mp3` · `aac` · `ogg` · `opus` · `flac` · `m4a` · `sph`

## Features

### Playback and metadata

- Play and pause audio, seek through the file, and jump backward or forward by five seconds.
- Adjust the playback volume using a percentage or dB scale.
- Optionally use the Space key to play and pause, and choose how seeking affects playback.
- View the encoding, format, channel count, sample rate, file size, and duration.
- Apply optional high-pass and low-pass filters during playback.

### Waveform and spectrogram analysis

- Render waveform and spectrogram views for each audio channel.
- Analyze the whole file or a specific time range.
- Choose a spectrogram frequency scale: linear, logarithmic, or Mel.
- Adjust the FFT window size, frequency range, amplitude range, and Mel filter count.
- Show or hide either visualization and adjust their ranges from the Settings panel.

### Interactive graphs and WAV export

- Click a waveform or spectrogram to seek to that position.
- Drag across a graph to select a time range. The selection can be cleared or exported as a new WAV file with a custom filename.
- Hold **Ctrl** while dragging to zoom the time range and reanalyze.
- Hold **Shift** while dragging to zoom the value range: amplitude on a waveform or frequency on a spectrogram.
- Right-click a graph to restore its full range. Hold **Ctrl** to reset only time, or **Shift** to reset only amplitude and frequency.

![Audio Waveform Preview](images/how-to-use.gif)

## Usage

1. Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=nh-kng.audio-waveform-preview).
2. Open a supported audio file in VS Code. The Audio Preview custom editor opens by default.
3. If the file opens as text, right-click its editor tab and choose **Reopen Editor With** → **Audio Preview (NH-KNG)**.
4. Use the playback controls to listen, then select **Analyze audio** to render the waveform and spectrogram. You can enable automatic analysis in the settings below.
5. Open **Settings** in the preview to adjust playback filters and analysis options. Select part of a graph to export that range as a WAV file.

Audio playback requires a trusted workspace. To use playback, trust the folder when VS Code prompts you.

## Settings

Configuration is optional. Set these options in VS Code Settings or `settings.json` to control the defaults used when a preview opens:

```jsonc
{
  "WavPreview.autoAnalyze": true,
  "WavPreview.playerDefault": {
    "volumeUnitDb": true,
    "initialVolumeDb": -12,
    "enableSpacekeyPlay": true,
    "enableSeekToPlay": true,
    "enableHpf": false,
    "enableLpf": false,
  },
  "WavPreview.analyzeDefault": {
    "waveformVisible": true,
    "spectrogramVisible": true,
    "windowSizeIndex": 2,
    "frequencyScale": 1,
    "spectrogramAmplitudeRange": -90,
  },
}
```

`frequencyScale` accepts `0` for linear, `1` for logarithmic, and `2` for Mel. `windowSizeIndex` selects FFT windows from 256 through 32768 samples, in powers of two. For the complete list of playback and analysis options, see [`src/config.ts`](https://github.com/nh-kng/vscode-audio-preview/blob/main/src/config.ts).

## Links and support

- [Repository](https://github.com/nh-kng/vscode-audio-preview)
- [Report an issue or request a feature](https://github.com/nh-kng/vscode-audio-preview/issues)
- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=nh-kng.audio-waveform-preview)

Forked from [sukumo28/vscode-audio-preview](https://github.com/sukumo28/vscode-audio-preview).
