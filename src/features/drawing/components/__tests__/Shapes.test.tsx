/**
 * Shapes — Renderer tests
 * The components are thin SVG; assert on the path-string helper plus
 * that the components mount without errors.
 */

import { render } from '@testing-library/react-native';

import {
  FreehandShapeView,
  LineShapeView,
  pointsToPath,
} from '../Shapes';
import type { FreehandShape, LineShape } from '@/features/drawing/types';

describe('pointsToPath', () => {
  it('returns empty for empty input', () => {
    expect(pointsToPath([])).toBe('');
  });

  it('builds M + L commands from a list of points', () => {
    expect(
      pointsToPath([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]),
    ).toBe('M 0 0 L 10 20 L 30 40');
  });
});

const line: LineShape = {
  id: 'shape-1',
  kind: 'line',
  color: 'white',
  start: { x: 10, y: 10 },
  end: { x: 100, y: 100 },
};

const freehand: FreehandShape = {
  id: 'shape-2',
  kind: 'freehand',
  color: 'gold',
  points: [
    { x: 0, y: 0 },
    { x: 5, y: 5 },
  ],
};

describe('LineShapeView / FreehandShapeView', () => {
  it('renders a line', () => {
    const { toJSON } = render(<LineShapeView shape={line} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders endpoint handles when showEndpoints is set', () => {
    const withHandles = render(
      <LineShapeView shape={line} showEndpoints />,
    );
    const withoutHandles = render(
      <LineShapeView shape={line} showEndpoints={false} />,
    );
    // Compare tree sizes: endpoints add nodes. Exact counts are
    // brittle under the SVG mock, so just assert "more nodes when
    // endpoints are shown".
    const a = JSON.stringify(withHandles.toJSON());
    const b = JSON.stringify(withoutHandles.toJSON());
    expect(a.length).toBeGreaterThan(b.length);
  });

  it('renders a freehand path', () => {
    const { toJSON } = render(<FreehandShapeView shape={freehand} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders nothing when freehand has < 2 points', () => {
    const { toJSON } = render(
      <FreehandShapeView
        shape={{ ...freehand, points: [{ x: 1, y: 1 }] }}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});
