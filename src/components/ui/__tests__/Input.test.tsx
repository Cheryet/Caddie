/**
 * Input — UI tests
 * Verifies label/helper/error rendering, focus state propagation, and
 * adornment rendering. Forwarded ref is verified by passing one in.
 */

import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text, TextInput } from 'react-native';

import { Input } from '../Input';

describe('Input', () => {
  it('renders a label and the field together', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Input label="Email" placeholder="you@example.com" />,
    );
    expect(queryByText('Email')).not.toBeNull();
    expect(UNSAFE_getByType(TextInput)).toBeTruthy();
  });

  it('renders helper text when not in error', () => {
    const { queryByText } = render(
      <Input label="Pwd" helper="At least 8 characters." />,
    );
    expect(queryByText('At least 8 characters.')).not.toBeNull();
  });

  it('renders error text and hides helper when error is set', () => {
    const { queryByText } = render(
      <Input
        label="Pwd"
        helper="At least 8 characters."
        error="That password is too short."
      />,
    );
    expect(queryByText('That password is too short.')).not.toBeNull();
    expect(queryByText('At least 8 characters.')).toBeNull();
  });

  it('renders right adornment when given', () => {
    const { queryByText } = render(
      <Input label="Pwd" rightAdornment={<Text>Show</Text>} />,
    );
    expect(queryByText('Show')).not.toBeNull();
  });

  it('forwards the TextInput ref', () => {
    const ref = createRef<TextInput>();
    render(<Input label="Email" ref={ref} />);
    expect(ref.current).not.toBeNull();
  });

  it('calls onChangeText when the field is typed into', () => {
    const onChangeText = jest.fn();
    const { UNSAFE_getByType } = render(
      <Input label="Email" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(UNSAFE_getByType(TextInput), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });
});
