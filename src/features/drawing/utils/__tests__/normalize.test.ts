/**
 * normalize — Unit tests
 * Pure math + JSON. Round-trip on every shape kind, schema rejection
 * for malformed input, null-safe load.
 */

import { fromPersisted, toPersisted } from '../normalize';
import type {
  AngleShape,
  CanvasSize,
  CircleShape,
  DrawingState,
  FreehandShape,
  LineShape,
  PlaneShape,
} from '@/features/drawing/types';

const SIZE: CanvasSize = { width: 400, height: 800 };

const line: LineShape = {
  id: 'L',
  kind: 'line',
  color: 'white',
  start: { x: 100, y: 200 },
  end: { x: 300, y: 600 },
};

const freehand: FreehandShape = {
  id: 'F',
  kind: 'freehand',
  color: 'gold',
  points: [
    { x: 0, y: 0 },
    { x: 200, y: 400 },
    { x: 400, y: 800 },
  ],
};

const circle: CircleShape = {
  id: 'C',
  kind: 'circle',
  color: 'red',
  center: { x: 200, y: 400 },
  radius: 80,
};

const plane: PlaneShape = {
  id: 'P',
  kind: 'plane',
  color: 'blue',
  a: { x: 50, y: 100 },
  b: { x: 350, y: 700 },
};

const angle: AngleShape = {
  id: 'A',
  kind: 'angle',
  color: 'white',
  vertex: { x: 200, y: 400 },
  end1: { x: 300, y: 400 },
  end2: { x: 200, y: 200 },
};

const allShapes: DrawingState = [line, freehand, circle, plane, angle];

describe('toPersisted / fromPersisted round-trip', () => {
  it('preserves every shape kind through a round-trip at the same canvas size', () => {
    const persisted = toPersisted(allShapes, SIZE);
    expect(persisted.v).toBe(1);
    const round = fromPersisted(persisted, SIZE);
    expect(round).not.toBeNull();
    if (!round || 'error' in round) throw new Error('expected success');
    expect(round.shapes).toEqual(allShapes);
  });

  it('rescales when the canvas size differs on load', () => {
    const persisted = toPersisted([line], { width: 100, height: 200 });
    const loaded = fromPersisted(persisted, { width: 200, height: 400 });
    if (!loaded || 'error' in loaded) throw new Error('expected success');
    const out = loaded.shapes[0];
    if (out?.kind !== 'line') throw new Error('expected line');
    // Original line was (10,20)→(30,60) at 100×200. At 200×400 the
    // proportional position doubles → (20,40)→(60,120).
    // Wait — the input was (100,200)→(300,600) at 400×800; normalized
    // to (0.25, 0.25) → (0.75, 0.75). At 200×400 that's (50,100) →
    // (150,300).
    // We used a different size for `persisted` in this case — at
    // 100×200 the line's (100,200) maps to (1.0, 1.0) and (300,600)
    // is outside, so the test is best read against the actual numbers.
    expect(out.start.x).toBeCloseTo((100 / 100) * 200);
    expect(out.start.y).toBeCloseTo((200 / 200) * 400);
  });

  it('returns null for null/undefined input', () => {
    expect(fromPersisted(null, SIZE)).toBeNull();
    expect(fromPersisted(undefined, SIZE)).toBeNull();
  });

  it('returns { error: "invalid" } for malformed JSON', () => {
    expect(fromPersisted({ v: 'not-a-number', shapes: [] }, SIZE)).toEqual({
      error: 'invalid',
    });
    expect(fromPersisted({ v: 1, shapes: [{ kind: 'unknown' }] }, SIZE)).toEqual({
      error: 'invalid',
    });
    expect(fromPersisted('not even an object', SIZE)).toEqual({
      error: 'invalid',
    });
  });
});
