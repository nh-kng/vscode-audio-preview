import debugPause from "./assets/icons/debug-pause.svg";
import debugStepBack from "./assets/icons/debug-step-back.svg";
import debugStepOver from "./assets/icons/debug-step-over.svg";
import exportIcon from "./assets/icons/export.svg";
import foldDown from "./assets/icons/fold-down.svg";
import graph from "./assets/icons/graph.svg";
import mute from "./assets/icons/mute.svg";
import playCircle from "./assets/icons/play-circle.svg";
import play from "./assets/icons/play.svg";
import pulse from "./assets/icons/pulse.svg";
import unmute from "./assets/icons/unmute.svg";

export type IconName =
  | "debug-pause"
  | "debug-step-back"
  | "debug-step-over"
  | "export"
  | "fold-down"
  | "graph"
  | "mute"
  | "play-circle"
  | "play"
  | "pulse"
  | "unmute";

const iconSvgs = new Map<IconName, string>([
  ["debug-pause", debugPause],
  ["debug-step-back", debugStepBack],
  ["debug-step-over", debugStepOver],
  ["export", exportIcon],
  ["fold-down", foldDown],
  ["graph", graph],
  ["mute", mute],
  ["play-circle", playCircle],
  ["play", play],
  ["pulse", pulse],
  ["unmute", unmute],
]);

function getIconSvg(name: IconName): string {
  const svg = iconSvgs.get(name);
  if (!svg) {
    throw new Error(`Missing local icon asset: ${name}`);
  }
  return svg.replace("<svg ", '<svg focusable="false" ');
}

export function iconMarkup(name: IconName, className: string): string {
  return `<span class="icon ${className}" data-icon="${name}" aria-hidden="true">${getIconSvg(name)}</span>`;
}

export function setIcon(element: HTMLElement, name: IconName): void {
  element.dataset.icon = name;
  element.innerHTML = getIconSvg(name);
}
