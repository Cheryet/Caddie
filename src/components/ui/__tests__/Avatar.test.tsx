/**
 * Avatar — UI tests
 * Verifies initials derivation and the image-source fallback. Image
 * rendering itself is React Native's concern; we don't snapshot it.
 */

import { render } from '@testing-library/react-native';

import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders initials when no image source is given', () => {
    const { queryByText } = render(<Avatar name="Cheryet Heryet" />);
    expect(queryByText('CH')).not.toBeNull();
  });

  it('uses first letter when only one name word is given', () => {
    const { queryByText } = render(<Avatar name="Cheryet" />);
    expect(queryByText('C')).not.toBeNull();
  });

  it('falls back to ? when name is empty', () => {
    const { queryByText } = render(<Avatar />);
    expect(queryByText('?')).not.toBeNull();
  });

  it('renders an Image when source is given', () => {
    const { UNSAFE_getByType } = render(
      <Avatar source={{ uri: 'https://example.com/a.png' }} />,
    );
    // RN's Image; we just confirm it's present.
    const { Image } = require('react-native');
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });
});
