/**
 * ProGate — UI tests
 * Verifies the gate switches on `isPro` from the Zustand store:
 *   - isPro=true  → renders children transparently
 *   - isPro=false → renders the upgrade card (no children visible)
 *
 * The Upgrade CTA's onPress is a no-op at this phase; not tested.
 */

import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import { ProGate } from '../ProGate';

beforeEach(() => {
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
});
