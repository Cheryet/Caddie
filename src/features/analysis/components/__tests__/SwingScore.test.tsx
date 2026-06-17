/**
 * SwingScore — Component tests
 * Asserts the score numeral, the bracket label per DESIGN_SYSTEM §5, and
 * that the progress arc takes the bracket colour. react-native-svg is
 * mocked in jest.setup (each primitive → View tagged `svg-<Name>`).
 */

import { render } from '@testing-library/react-native';

import { SwingScore } from '../SwingScore';
import { colors } from '@/theme';

describe('SwingScore', () => {
  it('renders the (rounded) score', () => {
    const { getByText } = render(<SwingScore score={78} />);
    expect(getByText('78')).toBeTruthy();
  });

  it('rounds a fractional score', () => {
    const { getByText } = render(<SwingScore score={78.6} />);
    expect(getByText('79')).toBeTruthy();
  });

  it.each([
    [30, 'Poor', colors.semantic.error],
    [50, 'Fair', colors.semantic.warning],
    [68, 'Good', colors.semantic.info],
    [78, 'Great', colors.semantic.success],
    [96, 'Excellent', colors.gold.default],
  ])('score %i shows the %s bracket label + colour', (score, label, color) => {
    const { getByText, getAllByTestId } = render(<SwingScore score={score} />);
    expect(getByText(label)).toBeTruthy();
    // The progress arc is the circle stroked in the bracket colour.
    const arcs = getAllByTestId('svg-Circle').filter(c => c.props.stroke === color);
    expect(arcs).toHaveLength(1);
  });

  it('renders a track + progress circle', () => {
    const { getAllByTestId } = render(<SwingScore score={78} />);
    expect(getAllByTestId('svg-Circle')).toHaveLength(2);
  });

  it('exposes an accessibility label with score and bracket', () => {
    const { getByLabelText } = render(<SwingScore score={78} />);
    expect(getByLabelText('Swing score 78 out of 100, Great')).toBeTruthy();
  });
});
