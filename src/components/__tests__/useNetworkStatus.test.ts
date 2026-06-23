/**
 * useNetworkStatus — Hook tests
 * Drives the netinfo stub (jest.setup.js) to verify online default, offline
 * on a dropped connection, and unsubscribe on unmount.
 */

import { renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

import { useNetworkStatus } from '../useNetworkStatus';

const addEventListener = NetInfo.addEventListener as jest.Mock;

beforeEach(() => {
  // Reset to the connected default before each case.
  addEventListener.mockImplementation(cb => {
    cb({ isConnected: true, isInternetReachable: true });
    return () => {};
  });
});

describe('useNetworkStatus', () => {
  it('reports online by default', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(false);
  });

  it('reports offline when the connection is down', () => {
    addEventListener.mockImplementation(cb => {
      cb({ isConnected: false, isInternetReachable: false });
      return () => {};
    });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(true);
  });

  it('treats an unknown connection as online (no false banner)', () => {
    addEventListener.mockImplementation(cb => {
      cb({ isConnected: null, isInternetReachable: null });
      return () => {};
    });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = jest.fn();
    addEventListener.mockImplementation(cb => {
      cb({ isConnected: true });
      return unsubscribe;
    });
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
