/**
 * InsightFrame — Component tests
 * Covers the three states: a Skeleton while loading, the Image when ready,
 * and the frameless fallback (glyph tile + caption) on error or when ready
 * without a URI.
 */

import { render } from '@testing-library/react-native';

import { InsightFrame } from '../InsightFrame';

describe('InsightFrame', () => {
  it('shows a skeleton while loading', () => {
    const { getByTestId, queryByTestId } = render(
      <InsightFrame status="loading" frameUri={null} severity="major" />,
    );
    expect(getByTestId('insight-frame-loading')).toBeTruthy();
    expect(queryByTestId('insight-frame-image')).toBeNull();
  });

  it('renders the frame image when ready', () => {
    const { getByTestId } = render(
      <InsightFrame
        status="ready"
        frameUri="data:image/jpeg;base64,xx"
        severity="major"
      />,
    );
    expect(getByTestId('insight-frame-image')).toBeTruthy();
  });

  it('falls back to a frameless tile on error', () => {
    const { getByTestId, getByText } = render(
      <InsightFrame status="error" frameUri={null} severity="moderate" />,
    );
    expect(getByTestId('insight-frame-fallback')).toBeTruthy();
    expect(getByText('Frame unavailable')).toBeTruthy();
  });

  it('falls back when ready but the URI is missing', () => {
    const { getByTestId } = render(
      <InsightFrame status="ready" frameUri={null} severity="minor" />,
    );
    expect(getByTestId('insight-frame-fallback')).toBeTruthy();
  });
});
