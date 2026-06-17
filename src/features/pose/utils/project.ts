/**
 * project — Pure geometry for the pose overlay
 * The video plays with `resizeMode="contain"`, so it's letterboxed (or
 * pillarboxed) inside the player view. Pose landmarks are normalised
 * [0,1] relative to the *video frame*, not the player view — so before
 * the overlay can draw them, they have to be mapped into the
 * contain-fitted content rect. These pure helpers do that math; they're
 * unit-tested in isolation so the SVG component stays trivial.
 *
 * Part of: src/features/pose/
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The content rect of a `contain`-fitted video of aspect `videoAspect`
 * (width / height) inside `canvas`. When inputs are degenerate (zero
 * size, non-positive aspect) the rect falls back to the full canvas so
 * the overlay still renders something sane rather than NaNs.
 */
export function containRect(canvas: Size, videoAspect: number): Rect {
  if (canvas.width <= 0 || canvas.height <= 0 || videoAspect <= 0) {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }

  const canvasAspect = canvas.width / canvas.height;

  if (canvasAspect > videoAspect) {
    // Canvas is wider than the video → bars on the left/right.
    const width = canvas.height * videoAspect;
    return {
      x: (canvas.width - width) / 2,
      y: 0,
      width,
      height: canvas.height,
    };
  }

  // Canvas is taller than (or equal to) the video → bars top/bottom.
  const height = canvas.width / videoAspect;
  return {
    x: 0,
    y: (canvas.height - height) / 2,
    width: canvas.width,
    height,
  };
}

/** Project a normalised [0,1] point into canvas pixels via `rect`. */
export function projectPoint(
  nx: number,
  ny: number,
  rect: Rect,
): { x: number; y: number } {
  return {
    x: rect.x + nx * rect.width,
    y: rect.y + ny * rect.height,
  };
}
