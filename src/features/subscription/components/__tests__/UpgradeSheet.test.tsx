/**
 * UpgradeSheet — Component tests
 * useUpgrade is mocked so we drive the view's states. Covers: the singleton
 * opens the sheet (and flips useUpgrade's `enabled`), the plans render with
 * prices + the annual "Best value" highlight, tapping a plan / Restore
 * dispatches, and the unavailable state.
 */

import type { ReactElement } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpgradeSheet, UpgradeSheetHost } from '../UpgradeSheet';
import type { ProPackage } from '@/core/revenuecat/client';
import type { UpgradeStatus } from '../../hooks/useUpgrade';

interface UpgradeMockState {
  status: UpgradeStatus;
  packages: ProPackage[];
  purchase: jest.Mock;
  restore: jest.Mock;
  lastEnabled: boolean;
}

jest.mock('../../hooks/useUpgrade', () => {
  const state: UpgradeMockState = {
    status: 'ready',
    packages: [],
    purchase: jest.fn(),
    restore: jest.fn(),
    lastEnabled: false,
  };
  return {
    useUpgrade: (opts: { enabled: boolean }) => {
      state.lastEnabled = opts.enabled;
      return state;
    },
    __state: state,
  };
});

const upgradeState = (
  jest.requireMock('../../hooks/useUpgrade') as { __state: UpgradeMockState }
).__state;

const PACKAGES: ProPackage[] = [
  { period: 'monthly', priceString: '$9.99', rcPackage: {} as never },
  { period: 'annual', priceString: '$59.99', rcPackage: {} as never },
];

function renderHost(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      {ui}
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  UpgradeSheet.hide();
  upgradeState.status = 'ready';
  upgradeState.packages = PACKAGES;
  upgradeState.purchase = jest.fn();
  upgradeState.restore = jest.fn();
  upgradeState.lastEnabled = false;
});

describe('UpgradeSheet', () => {
  it('enables the hook only once shown', () => {
    renderHost(<UpgradeSheetHost />);
    expect(upgradeState.lastEnabled).toBe(false);
    act(() => UpgradeSheet.show());
    expect(upgradeState.lastEnabled).toBe(true);
  });

  it('renders the monthly + annual plans with prices and the Best value tag', () => {
    const { getByText } = renderHost(<UpgradeSheetHost />);
    act(() => UpgradeSheet.show());
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('Annual')).toBeTruthy();
    expect(getByText('$9.99')).toBeTruthy();
    expect(getByText('$59.99')).toBeTruthy();
    expect(getByText('Best value')).toBeTruthy();
  });

  it('purchases the tapped plan', () => {
    const { getByLabelText } = renderHost(<UpgradeSheetHost />);
    act(() => UpgradeSheet.show());
    fireEvent.press(getByLabelText('Annual plan, $59.99'));
    expect(upgradeState.purchase).toHaveBeenCalledWith('annual');
  });

  it('dispatches restore', () => {
    const { getByText } = renderHost(<UpgradeSheetHost />);
    act(() => UpgradeSheet.show());
    fireEvent.press(getByText('Restore purchases'));
    expect(upgradeState.restore).toHaveBeenCalledTimes(1);
  });

  it('shows the unavailable message when there are no plans', () => {
    upgradeState.status = 'unavailable';
    upgradeState.packages = [];
    const { getByText, queryByText } = renderHost(<UpgradeSheetHost />);
    act(() => UpgradeSheet.show());
    expect(getByText(/Plans are unavailable/)).toBeTruthy();
    expect(queryByText('Annual')).toBeNull();
  });
});
