/**
 * drawing/geometry — Unit tests
 * Pure math, no mocks. Tolerance comparisons for floats.
 */

import {
  angleDegrees,
  distance,
  distanceToLine,
  distanceToSegment,
  extendLineToCanvas,
  hitTestShape,
  translateShape,
} from '../geometry';
import type { Shape } from '../types';

describe('distance', () => {
  it('returns 0 for identical points', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
  it('computes euclidean', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('distanceToSegment', () => {
  it('returns endpoint distance when before the segment', () => {
    expect(
      distanceToSegment({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBe(10);
  });
  it('returns perpendicular distance when projection lies within segment', () => {
    expect(
      distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBe(5);
  });
  it('handles degenerate segments', () => {
    expect(
      distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
    ).toBe(5);
  });
});

describe('distanceToLine', () => {
  it('is the perpendicular distance to the infinite line', () => {
    // Vertical line x=0; point (5,100) is 5 units away.
    expect(
      distanceToLine({ x: 5, y: 100 }, { x: 0, y: 0 }, { x: 0, y: 10 }),
    ).toBe(5);
  });
});

describe('extendLineToCanvas', () => {
  const size = { width: 100, height: 100 };

  it('extends a 45° diagonal to opposite corners', () => {
    const result = extendLineToCanvas({ x: 10, y: 10 }, { x: 20, y: 20 }, size);
    expect(result).not.toBeNull();
    expect(result!.p1).toEqual({ x: 0, y: 0 });
    expect(result!.p2).toEqual({ x: 100, y: 100 });
  });

  it('extends a horizontal line to left/right edges', () => {
    const result = extendLineToCanvas({ x: 30, y: 50 }, { x: 60, y: 50 }, size);
    expect(result).not.toBeNull();
    expect(result!.p1).toEqual({ x: 0, y: 50 });
    expect(result!.p2).toEqual({ x: 100, y: 50 });
  });

  it('returns null for degenerate input', () => {
    expect(
      extendLineToCanvas({ x: 5, y: 5 }, { x: 5, y: 5 }, size),
    ).toBeNull();
  });
});

describe('angleDegrees', () => {
  it('returns 90 for perpendicular rays', () => {
    expect(
      angleDegrees(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ),
    ).toBe(90);
  });
  it('returns 180 for opposite rays', () => {
    expect(
      angleDegrees(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: -10, y: 0 },
      ),
    ).toBe(180);
  });
  it('returns 0 when a ray has zero length', () => {
    expect(
      angleDegrees(
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
    ).toBe(0);
  });
});

describe('hitTestShape', () => {
  const line: Shape = {
    id: 'L',
    kind: 'line',
    color: 'white',
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 },
  };
  const circle: Shape = {
    id: 'C',
    kind: 'circle',
    color: 'white',
    center: { x: 50, y: 50 },
    radius: 20,
  };

  it('matches when point is within radius of a line', () => {
    expect(hitTestShape([line], { x: 50, y: 3 }, 5)?.id).toBe('L');
    expect(hitTestShape([line], { x: 50, y: 100 }, 5)).toBeNull();
  });

  it('matches inside a circle', () => {
    expect(hitTestShape([circle], { x: 55, y: 55 }, 5)?.id).toBe('C');
    expect(hitTestShape([circle], { x: 100, y: 100 }, 5)).toBeNull();
  });

  it('returns the most recently committed shape when stacked', () => {
    expect(hitTestShape([line, circle], { x: 50, y: 50 }, 5)?.id).toBe('C');
  });
});

describe('translateShape', () => {
  it('offsets a line', () => {
    const out = translateShape(
      {
        id: 'L',
        kind: 'line',
        color: 'white',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
      5,
      -3,
    );
    expect(out).toMatchObject({
      start: { x: 5, y: -3 },
      end: { x: 15, y: -3 },
    });
  });

  it('offsets a circle (center only; radius unchanged)', () => {
    const out = translateShape(
      {
        id: 'C',
        kind: 'circle',
        color: 'white',
        center: { x: 50, y: 50 },
        radius: 20,
      },
      10,
      10,
    );
    expect(out).toMatchObject({ center: { x: 60, y: 60 }, radius: 20 });
  });

  it('offsets every point in a freehand', () => {
    const out = translateShape(
      {
        id: 'F',
        kind: 'freehand',
        color: 'white',
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
      },
      1,
      1,
    );
    expect(out).toMatchObject({
      points: [
        { x: 1, y: 1 },
        { x: 6, y: 6 },
      ],
    });
  });
});
