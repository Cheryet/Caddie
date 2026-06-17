/**
 * pose/project — Unit tests
 * The letterbox math the overlay relies on. Covers pillarbox (wide
 * canvas), letterbox (tall canvas), the equal-aspect pass-through, the
 * degenerate guards, and point projection into the content rect.
 */

import { containRect, projectPoint } from '../project';

describe('containRect', () => {
  it('pillarboxes a portrait video in a wide canvas (bars left/right)', () => {
    // canvas 200x100 (aspect 2), video aspect 1 → content is 100x100 centred
    const rect = containRect({ width: 200, height: 100 }, 1);
    expect(rect).toEqual({ x: 50, y: 0, width: 100, height: 100 });
  });

  it('letterboxes a wide video in a tall canvas (bars top/bottom)', () => {
    // canvas 100x200 (aspect 0.5), video aspect 1 → content is 100x100 centred
    const rect = containRect({ width: 100, height: 200 }, 1);
    expect(rect).toEqual({ x: 0, y: 50, width: 100, height: 100 });
  });

  it('fills the canvas when aspects match', () => {
    const rect = containRect({ width: 160, height: 90 }, 16 / 9);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(0);
    expect(rect.width).toBeCloseTo(160);
    expect(rect.height).toBeCloseTo(90);
  });

  it('falls back to the full canvas on degenerate inputs', () => {
    expect(containRect({ width: 0, height: 100 }, 1)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 100,
    });
    expect(containRect({ width: 100, height: 100 }, 0)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });
});

describe('projectPoint', () => {
  const rect = { x: 50, y: 0, width: 100, height: 100 };

  it('maps the top-left corner to the rect origin', () => {
    expect(projectPoint(0, 0, rect)).toEqual({ x: 50, y: 0 });
  });

  it('maps the centre to the rect centre', () => {
    expect(projectPoint(0.5, 0.5, rect)).toEqual({ x: 100, y: 50 });
  });

  it('maps the bottom-right corner to the rect far edge', () => {
    expect(projectPoint(1, 1, rect)).toEqual({ x: 150, y: 100 });
  });
});
