/**
 * SyncToggle — Component tests
 * The shared Sync pill (strip + floating variants). Verifies it toggles when
 * enabled, no-ops + dims when both impacts aren't marked, and reflects state.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SyncToggle } from '../SyncToggle';

describe('SyncToggle', () => {
  it('toggles when enabled (floating variant)', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <SyncToggle variant="floating" syncOn={false} canSync onToggle={onToggle} />,
    );
    fireEvent.press(getByLabelText('Sync timelines'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('is disabled and inert until both impacts are marked', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <SyncToggle variant="floating" syncOn={false} canSync={false} onToggle={onToggle} />,
    );
    const toggle = getByLabelText('Sync timelines');
    fireEvent.press(toggle);
    expect(onToggle).not.toHaveBeenCalled();
    expect(toggle.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('reflects the on state', () => {
    const { getByLabelText } = render(
      <SyncToggle variant="strip" syncOn canSync onToggle={jest.fn()} />,
    );
    expect(getByLabelText('Sync timelines').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });
});
