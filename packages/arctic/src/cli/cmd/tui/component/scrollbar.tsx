import { RGBA } from "@opentui/core"

export interface ScrollbarOptions {
  visible?: boolean
}

export function useScrollbar(options: ScrollbarOptions = {}) {
  if (!options.visible) {
    return { visible: false as const }
  }

  return {
    width: 1,
    trackOptions: {
      backgroundColor: RGBA.fromInts(80, 80, 80, 102),
      foregroundColor: RGBA.fromInts(180, 180, 180, 255),
      width: 1,
    },
  }
}
