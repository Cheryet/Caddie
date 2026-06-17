/**
 * AnalysisError — Component tests
 * Covers the default + custom title, the message, and the retryable vs
 * non-retryable (daily-limit) branches.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { AnalysisError } from '../AnalysisError';

describe('AnalysisError', () => {
  it('renders the default title and the message', () => {
    const { getByText } = render(
      <AnalysisError message="Analysis timed out. Check your connection." />,
    );
    expect(getByText("Analysis didn't go through")).toBeTruthy();
    expect(getByText('Analysis timed out. Check your connection.')).toBeTruthy();
  });

  it('renders a custom title', () => {
    const { getByText } = render(
      <AnalysisError title="Daily limit reached" message="Come back tomorrow." />,
    );
    expect(getByText('Daily limit reached')).toBeTruthy();
  });

  it('renders and fires the retry CTA when onRetry is provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <AnalysisError message="Something went wrong." onRetry={onRetry} />,
    );
    fireEvent.press(getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry CTA for non-retryable errors', () => {
    const { queryByText } = render(
      <AnalysisError message="You've used all 10 analyses for today." />,
    );
    expect(queryByText('Try again')).toBeNull();
  });
});
