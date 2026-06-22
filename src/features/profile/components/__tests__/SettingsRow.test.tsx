/**
 * SettingsRow — Component tests
 * Verifies label/value render, the onPress fires, and a custom right control
 * renders in place of the value.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SettingsRow } from '../SettingsRow';

describe('SettingsRow', () => {
  it('renders label and value', () => {
    const { getByText } = render(<SettingsRow label="Email" value="a@b.com" />);
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('a@b.com')).toBeTruthy();
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow label="Help center" onPress={onPress} />,
    );
    fireEvent.press(getByText('Help center'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a custom right control', () => {
    const { getByText } = render(
      <SettingsRow label="Toggle row" right={<Text>RIGHT</Text>} />,
    );
    expect(getByText('RIGHT')).toBeTruthy();
  });
});
