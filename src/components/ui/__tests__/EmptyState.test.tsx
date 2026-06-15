/**
 * EmptyState — UI tests
 * Verifies title/body rendering and that the optional action button only
 * renders when both `actionLabel` and `onAction` are provided.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and body', () => {
    const { queryByText } = render(
      <EmptyState
        icon="video.slash"
        title="No swings yet"
        body="Record your first swing to get started."
      />,
    );
    expect(queryByText('No swings yet')).not.toBeNull();
    expect(queryByText('Record your first swing to get started.')).not.toBeNull();
  });

  it('omits body when not given', () => {
    const { queryByText } = render(
      <EmptyState icon="video.slash" title="Empty" />,
    );
    expect(queryByText('Empty')).not.toBeNull();
  });

  it('renders the action button and wires onAction when given', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="video.slash"
        title="Empty"
        actionLabel="Record now"
        onAction={onAction}
      />,
    );
    fireEvent.press(getByText('Record now'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render the action button without both label and handler', () => {
    const { queryByText } = render(
      <EmptyState icon="video.slash" title="Empty" actionLabel="X" />,
    );
    expect(queryByText('X')).toBeNull();
  });
});
