/**
 * useSubscription — hook tests
 * Verifies the public interface for Pro status: `isPro` reads from the
 * Zustand store, `refresh` writes the latest entitlement from
 * RevenueCat back to the store.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useAppStore } from '@/store/useAppStore';

// Mock the wrapper at the module boundary so the test doesn't drag in
// the real SDK init logic.
jest.mock('@/core/revenuecat/client', () => ({
  initRevenueCat: jest.fn(),
  getProEntitlementActive: jest.fn(),
}));
import * as rcClient from '@/core/revenuecat/client';

import { useSubscription } from '../useSubscription';

const getProEntitlementActive = rcClient.getProEntitlementActive as jest.Mock;

beforeEach(() => {
  useAppStore.setState({
    user: null,
    isAuthLoading: false,
    isPro: false,
    theme: 'dark',
  });
  jest.clearAllMocks();
});

describe('useSubscription', () => {
  it('reads isPro from the Zustand store', () => {
    useAppStore.setState({ isPro: true });

    const { result } = renderHook(() => useSubscription());

    expect(result.current.isPro).toBe(true);
  });

  it('refresh() writes the entitlement state into the store', async () => {
    getProEntitlementActive.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useSubscription());
    expect(result.current.isPro).toBe(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(useAppStore.getState().isPro).toBe(true);
    expect(result.current.isPro).toBe(true);
  });

  it('refresh() flips isPro back to false when entitlement is lost', async () => {
    useAppStore.setState({ isPro: true });
    getProEntitlementActive.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useSubscription());

    await act(async () => {
      await result.current.refresh();
    });

    expect(useAppStore.getState().isPro).toBe(false);
  });
});
