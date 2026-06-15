/**
 * Button — UI tests
 * Verifies the matrix of variants, sizes, and disabled/loading states.
 * Visual hex values aren't asserted — we trust DESIGN_SYSTEM.md and the
 * theme tokens. We assert behavior: label visible, onPress fires (or
 * doesn't) per disabled/loading.
 */

import { fireEvent, render } from '@testing-library/react-native';

import type { ButtonSize, ButtonVariant } from '../Button';
import { Button } from '../Button';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

describe('Button', () => {
  it('renders its label', () => {
    const { queryByText } = render(
      <Button label="Sign in" onPress={() => {}} />,
    );
    expect(queryByText('Sign in')).not.toBeNull();
  });

  it.each(VARIANTS)('renders %s variant', variant => {
    const { queryByText } = render(
      <Button label="X" onPress={() => {}} variant={variant} />,
    );
    expect(queryByText('X')).not.toBeNull();
  });

  it.each(SIZES)('renders %s size', size => {
    const { queryByText } = render(
      <Button label="X" onPress={() => {}} size={size} />,
    );
    expect(queryByText('X')).not.toBeNull();
  });

  it('fires onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Go" onPress={onPress} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="Go" onPress={onPress} disabled />,
    );
    fireEvent.press(getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides the label and shows a spinner when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button label="Go" onPress={() => {}} loading />,
    );
    expect(queryByText('Go')).toBeNull();
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not fire onPress when loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Button label="Go" onPress={onPress} loading />,
    );
    const { ActivityIndicator } = require('react-native');
    fireEvent.press(UNSAFE_getByType(ActivityIndicator).parent ?? UNSAFE_getByType(ActivityIndicator));
    expect(onPress).not.toHaveBeenCalled();
  });
});
