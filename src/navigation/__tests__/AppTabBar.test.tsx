/**
 * AppTabBar — tests
 * Verifies the bar renders four tabs + the Record FAB, dispatches tab
 * navigation correctly, and dispatches Camera navigation when the FAB
 * is pressed.
 */

import { fireEvent, render } from '@testing-library/react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { AppTabBar } from '../AppTabBar';

// Build a minimal BottomTabBarProps. Real React Navigation provides many
// more fields but only `state` (route name + index) and
// `navigation.navigate` are consumed by AppTabBar today.
function makeProps(focusedIndex = 0): {
  navigate: jest.Mock;
  props: BottomTabBarProps;
} {
  const navigate = jest.fn();
  const props = {
    state: {
      index: focusedIndex,
      routeNames: ['HomeTab', 'LibraryTab', 'TempoTab', 'ProfileTab'],
      routes: [
        { key: 'HomeTab', name: 'HomeTab' },
        { key: 'LibraryTab', name: 'LibraryTab' },
        { key: 'TempoTab', name: 'TempoTab' },
        { key: 'ProfileTab', name: 'ProfileTab' },
      ],
    },
    navigation: { navigate },
    descriptors: {},
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return { navigate, props };
}

describe('AppTabBar', () => {
  it('renders all four tab buttons by their accessibility label', () => {
    const { props } = makeProps();
    const { queryByLabelText } = render(<AppTabBar {...props} />);
    expect(queryByLabelText('Home')).not.toBeNull();
    expect(queryByLabelText('Library')).not.toBeNull();
    expect(queryByLabelText('Tempo')).not.toBeNull();
    expect(queryByLabelText('Profile')).not.toBeNull();
  });

  it('renders the Record FAB', () => {
    const { props } = makeProps();
    const { queryByLabelText } = render(<AppTabBar {...props} />);
    expect(queryByLabelText('Record swing')).not.toBeNull();
  });

  it('shows the label only for the active tab', () => {
    const { props } = makeProps(/* focusedIndex */ 1); // Library active
    const { queryByText } = render(<AppTabBar {...props} />);
    // The active tab's label text renders.
    expect(queryByText('Library')).not.toBeNull();
    // Inactive tabs do NOT render their label text node.
    expect(queryByText('Home')).toBeNull();
    expect(queryByText('Tempo')).toBeNull();
    expect(queryByText('Profile')).toBeNull();
  });

  it('navigates to a tab when its button is pressed', () => {
    const { props, navigate } = makeProps(/* focusedIndex */ 0);
    const { getByLabelText } = render(<AppTabBar {...props} />);
    fireEvent.press(getByLabelText('Tempo'));
    expect(navigate).toHaveBeenCalledWith('TempoTab');
  });

  it('does not navigate when the already-focused tab is pressed', () => {
    const { props, navigate } = makeProps(/* focusedIndex */ 0); // Home
    const { getByLabelText } = render(<AppTabBar {...props} />);
    fireEvent.press(getByLabelText('Home'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to Camera when the Record FAB is pressed', () => {
    const { props, navigate } = makeProps();
    const { getByLabelText } = render(<AppTabBar {...props} />);
    fireEvent.press(getByLabelText('Record swing'));
    expect(navigate).toHaveBeenCalledWith('Camera');
  });
});
