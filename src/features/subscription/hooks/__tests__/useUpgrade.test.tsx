/**
 * useUpgrade — Hook tests
 * The RevenueCat client + Toast + store are mocked. Covers: lazy load →
 * ready/unavailable, purchase success (setIsPro + dismiss), user-cancel
 * (silent), purchase error (toast, stays open), and restore both ways.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useUpgrade } from '../useUpgrade';
import {
  getProPackages,
  purchaseProPackage,
  restorePro,
  type ProPackage,
} from '@/core/revenuecat/client';
import { Toast } from '@/components/ui/Toast';

jest.mock('@/core/revenuecat/client', () => ({
  getProPackages: jest.fn(),
  purchaseProPackage: jest.fn(),
  restorePro: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({ Toast: { show: jest.fn() } }));

jest.mock('@/store/useAppStore', () => {
  const setIsPro = jest.fn();
  return {
    useAppStore: <T,>(selector: (s: { setIsPro: jest.Mock }) => T): T =>
      selector({ setIsPro }),
    __setIsPro: setIsPro,
  };
});

const setIsPro = (
  jest.requireMock('@/store/useAppStore') as { __setIsPro: jest.Mock }
).__setIsPro;
const mockGetPackages = getProPackages as jest.Mock;
const mockPurchase = purchaseProPackage as jest.Mock;
const mockRestore = restorePro as jest.Mock;
const mockToast = Toast.show as jest.Mock;

const PACKAGES: ProPackage[] = [
  { period: 'monthly', priceString: '$9.99', rcPackage: { id: 'm' } as never },
  { period: 'annual', priceString: '$59.99', rcPackage: { id: 'a' } as never },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPackages.mockResolvedValue(PACKAGES);
  mockPurchase.mockResolvedValue({ status: 'success' });
  mockRestore.mockResolvedValue(false);
});

describe('useUpgrade', () => {
  it('loads packages when enabled and becomes ready', async () => {
    const { result } = renderHook(() =>
      useUpgrade({ enabled: true, onClose: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.packages).toEqual(PACKAGES);
  });

  it('is unavailable when no packages are returned', async () => {
    mockGetPackages.mockResolvedValueOnce([]);
    const { result } = renderHook(() =>
      useUpgrade({ enabled: true, onClose: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });

  it('does not load packages while disabled', () => {
    renderHook(() => useUpgrade({ enabled: false, onClose: jest.fn() }));
    expect(mockGetPackages).not.toHaveBeenCalled();
  });

  it('purchases the chosen plan, sets Pro and dismisses', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useUpgrade({ enabled: true, onClose }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.purchase('annual');
    });

    expect(mockPurchase).toHaveBeenCalledWith({ id: 'a' });
    expect(setIsPro).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is silent and stays open when the user cancels', async () => {
    mockPurchase.mockResolvedValueOnce({ status: 'cancelled' });
    const onClose = jest.fn();
    const { result } = renderHook(() => useUpgrade({ enabled: true, onClose }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.purchase('monthly');
    });

    expect(setIsPro).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });

  it('toasts and stays open on a purchase error', async () => {
    mockPurchase.mockResolvedValueOnce({ status: 'error', message: 'declined' });
    const onClose = jest.fn();
    const { result } = renderHook(() => useUpgrade({ enabled: true, onClose }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.purchase('monthly');
    });

    expect(setIsPro).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });

  it('restores an active entitlement, sets Pro and dismisses', async () => {
    mockRestore.mockResolvedValueOnce(true);
    const onClose = jest.fn();
    const { result } = renderHook(() => useUpgrade({ enabled: true, onClose }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.restore();
    });

    expect(setIsPro).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('informs the user when there is nothing to restore', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useUpgrade({ enabled: true, onClose }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.restore();
    });

    expect(setIsPro).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'info' }),
    );
  });
});
