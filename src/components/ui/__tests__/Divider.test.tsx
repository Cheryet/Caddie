/**
 * Divider — UI tests
 * Trivial rendering check + inset prop application.
 */

import { render } from '@testing-library/react-native';

import { Divider } from '../Divider';

describe('Divider', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Divider />);
    expect(toJSON()).not.toBeNull();
  });

  it('applies a horizontal margin when inset is provided', () => {
    const { toJSON } = render(<Divider inset={16} />);
    const tree = toJSON() as { props: { style: unknown[] } } | null;
    expect(tree).not.toBeNull();
    const flat = JSON.stringify(tree?.props.style);
    expect(flat).toContain('"marginHorizontal":16');
  });
});
