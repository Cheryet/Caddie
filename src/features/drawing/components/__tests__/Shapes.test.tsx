/**
 * Shapes — Renderer tests
 * The components are thin SVG; assert on the path-string helper plus
 * that the components mount without errors.
 */

import { render } from '@testing-library/react-native';

import {
  AngleShapeView,
  CircleShapeView,
  FreehandShapeView,
  LineShapeView,
  PlaneShapeView,
  ShapeView,
  pointsToPath,
} from '../Shapes';
import type {
  AngleShape,
  CircleShape,
  FreehandShape,
  LineShape,
  PlaneShape,
} from '@/features/drawing/types';

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

// ───── New 2.3 renderers ────────────────────────────────────────────────

const circle: CircleShape = {
  id: 'C',
  kind: 'circle',
  color: 'red',
  center: { x: 50, y: 50 },
  radius: 20,
};

const plane: PlaneShape = {
  id: 'P',
  kind: 'plane',
  color: 'blue',
  a: { x: 10, y: 10 },
  b: { x: 20, y: 20 },
};

const angle: AngleShape = {
  id: 'A',
  kind: 'angle',
  color: 'gold',
  vertex: { x: 50, y: 50 },
  end1: { x: 100, y: 50 },
  end2: { x: 50, y: 100 },
};

describe('CircleShapeView', () => {
  it('renders a circle', () => {
    const { toJSON } = render(<CircleShapeView shape={circle} />);
    expect(toJSON()).toBeTruthy();
  });

  it('adds a halo node when selected', () => {
    const plain = JSON.stringify(render(<CircleShapeView shape={circle} />).toJSON());
    const sel = JSON.stringify(
      render(<CircleShapeView shape={circle} selected />).toJSON(),
    );
    expect(sel.length).toBeGreaterThan(plain.length);
  });
});

describe('PlaneShapeView', () => {
  it('falls back to a plain segment when canvas size is unknown', () => {
    const { toJSON } = render(
      <PlaneShapeView shape={plane} canvasSize={{ width: 0, height: 0 }} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders when canvas size is provided', () => {
    const { toJSON } = render(
      <PlaneShapeView shape={plane} canvasSize={{ width: 200, height: 200 }} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('AngleShapeView', () => {
  it('renders both rays plus a degree label', () => {
    const { toJSON } = render(<AngleShapeView shape={angle} />);
    const tree = JSON.stringify(toJSON());
    // Mocked SVG text renders the children directly; "90°" should
    // appear in the serialized tree.
    expect(tree).toContain('90');
  });
});

describe('ShapeView dispatcher', () => {
  it('handles every shape kind', () => {
    for (const s of [circle, plane, angle]) {
      const { toJSON } = render(
        <ShapeView
          shape={s}
          canvasSize={{ width: 200, height: 200 }}
        />,
      );
      expect(toJSON()).toBeTruthy();
    }
  });
});
