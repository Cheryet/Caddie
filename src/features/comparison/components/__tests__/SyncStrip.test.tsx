/**
 * SyncStrip — Component tests
 * Verifies the label switches with canSync, the toggle reflects syncOn via
 * its switch a11y state, and that it only fires onToggle when enabled.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SyncStrip } from '../SyncStrip';

describe('SyncStrip', () => {
  it('prompts to mark impact and stays disabled until both are marked', () => {
    const onToggle = jest.fn();
    const { getByText, getByLabelText } = render(
      <SyncStrip syncOn={false} canSync={false} onToggle={onToggle} />,
    );
    expect(getByText('Mark impact on both')).toBeTruthy();
    fireEvent.press(getByLabelText('Sync timelines'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows "Impact aligned" and toggles when both are marked', () => {
    const onToggle = jest.fn();
    const { getByText, getByLabelText } = render(
      <SyncStrip syncOn={false} canSync onToggle={onToggle} />,
    );
    expect(getByText('Impact aligned')).toBeTruthy();
    fireEvent.press(getByLabelText('Sync timelines'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects the on state via switch a11y state', () => {
    const { getByLabelText } = render(
      <SyncStrip syncOn canSync onToggle={jest.fn()} />,
    );
    expect(getByLabelText('Sync timelines').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });
  });
});
