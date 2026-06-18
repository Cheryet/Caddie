/**
 * ProGate — UI tests
 * Verifies the gate switches on `isPro` from the Zustand store:
 *   - isPro=true  → renders children transparently
 *   - isPro=false → renders the upgrade card (no children visible)
 *   - the "Upgrade to Pro" CTA opens the global UpgradeSheet (Phase 4.5)
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import { ProGate } from '../ProGate';
import { UpgradeSheet } from '@/features/subscription/components/UpgradeSheet';

// Stub the paywall singleton so we assert the trigger without mounting it.
jest.mock('@/features/subscription/components/UpgradeSheet', () => ({
  UpgradeSheet: { show: jest.fn(), hide: jest.fn() },
}));

const mockShow = UpgradeSheet.show as jest.Mock;

beforeEach(() => {
  mockShow.mockClear();
  useAppStore.setState({
    user: null,
    isAuthLoading: false,
    isPro: false,
    theme: 'dark',
  });
});

describe('ProGate', () => {
  it('renders children when the user has Pro', () => {
    useAppStore.setState({ isPro: true });

    const { queryByText } = render(
      <ProGate feature="AI Coaching">
        <Text>Pro content here</Text>
      </ProGate>,
    );

    expect(queryByText('Pro content here')).not.toBeNull();
    expect(queryByText('Upgrade to Pro')).toBeNull();
  });

  it('renders the upgrade card and hides children when not Pro', () => {
    useAppStore.setState({ isPro: false });

    const { queryByText } = render(
      <ProGate feature="AI Coaching">
        <Text>Pro content here</Text>
      </ProGate>,
    );

    expect(queryByText('Pro content here')).toBeNull();
    expect(queryByText('AI Coaching')).not.toBeNull();
    expect(queryByText('Upgrade to Pro')).not.toBeNull();
  });

  it('works without children as a screen-level replacement', () => {
    useAppStore.setState({ isPro: false });

    const { queryByText } = render(<ProGate feature="Analysis" />);

    expect(queryByText('Analysis')).not.toBeNull();
    expect(queryByText('Upgrade to Pro')).not.toBeNull();
  });

  it('opens the UpgradeSheet when the CTA is tapped', () => {
    useAppStore.setState({ isPro: false });

    const { getByText } = render(<ProGate feature="AI Coaching" />);
    fireEvent.press(getByText('Upgrade to Pro'));

    expect(mockShow).toHaveBeenCalledTimes(1);
  });
});
