/**
 * Card — UI tests
 * Verifies children render, both variants mount, and onPress fires for
 * the pressable variant. Press animation is Reanimated-driven and
 * exercised in isolation by Reanimated's own test suite — not retested
 * here.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '../Card';

describe('Card', () => {
  it('renders children for static variant', () => {
    const { queryByText } = render(
      <Card>
        <Text>inside</Text>
      </Card>,
    );
    expect(queryByText('inside')).not.toBeNull();
  });

  it('renders children for raised variant', () => {
    const { queryByText } = render(
      <Card variant="raised">
        <Text>inside-raised</Text>
      </Card>,
    );
    expect(queryByText('inside-raised')).not.toBeNull();
  });

  it('fires onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card onPress={onPress}>
        <Text>tap-me</Text>
      </Card>,
    );
    fireEvent.press(getByText('tap-me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
