/**
 * revenuecat client — wrapper tests
 * The full Purchases SDK is mocked at the module boundary via
 * jest.setup.js. These tests verify the wrapper's contract:
 *   - graceful no-op when the iOS API key is missing
 *   - entitlement check resolves to false when SDK is uninitialised
 *   - active caddie_pro entitlement → true
 *
 * The wrapper holds an `initialised` latch at module scope, so each
 * test re-requires the module after `jest.resetModules()`. The API key
 * is set on the mocked `react-native-config` default export BEFORE the
 * re-require so the freshly evaluated `@/constants/config` picks it up.
 */

import { RC_ENTITLEMENT } from '@/constants/config';

type ClientModule = typeof import('../client');
type PurchasesMock = {
  configure: jest.Mock;
  getCustomerInfo: jest.Mock;
  getOfferings: jest.Mock;
  purchasePackage: jest.Mock;
  restorePurchases: jest.Mock;
  setLogLevel: jest.Mock;
};

// Minimal stand-in for a PurchasesPackage — the wrapper only forwards it.
const FAKE_PKG = {} as Parameters<ClientModule['purchaseProPackage']>[0];

function loadFresh(apiKey: string): {
  client: ClientModule;
  purchases: PurchasesMock;
} {
  jest.resetModules();
  const Config = require('react-native-config').default as Record<
    string,
    string | undefined
  >;
  Config.REVENUECAT_API_KEY_IOS = apiKey;
  const purchases = require('react-native-purchases').default as PurchasesMock;
  const client = require('../client') as ClientModule;
  return { client, purchases };
}

describe('initRevenueCat', () => {
  it('no-ops when REVENUECAT_API_KEY_IOS is missing', async () => {
    const { client, purchases } = loadFresh('');

    await client.initRevenueCat();

    expect(purchases.configure).not.toHaveBeenCalled();
  });

  it('configures Purchases when the key is present', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');

    await client.initRevenueCat();

    expect(purchases.configure).toHaveBeenCalledWith({
      apiKey: 'appl_FAKE_KEY',
    });
  });

  it('only configures once across repeated calls', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');

    await client.initRevenueCat();
    await client.initRevenueCat();
    await client.initRevenueCat();

    expect(purchases.configure).toHaveBeenCalledTimes(1);
  });
});

describe('getProEntitlementActive', () => {
  it('returns false when SDK is uninitialised (no API key)', async () => {
    const { client, purchases } = loadFresh('');

    await expect(client.getProEntitlementActive()).resolves.toBe(false);
    expect(purchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('returns true when caddie_pro entitlement is active', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.getCustomerInfo.mockResolvedValueOnce({
      entitlements: { active: { [RC_ENTITLEMENT]: { isActive: true } } },
    });

    await client.initRevenueCat();
    await expect(client.getProEntitlementActive()).resolves.toBe(true);
  });

  it('returns false when the entitlement is absent', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.getCustomerInfo.mockResolvedValueOnce({
      entitlements: { active: {} },
    });

    await client.initRevenueCat();
    await expect(client.getProEntitlementActive()).resolves.toBe(false);
  });

  it('returns false when the SDK throws', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.getCustomerInfo.mockRejectedValueOnce(new Error('network down'));

    await client.initRevenueCat();
    await expect(client.getProEntitlementActive()).resolves.toBe(false);
  });
});

describe('getProPackages', () => {
  it('returns [] when the SDK is uninitialised (no API key)', async () => {
    const { client, purchases } = loadFresh('');

    await expect(client.getProPackages()).resolves.toEqual([]);
    expect(purchases.getOfferings).not.toHaveBeenCalled();
  });

  it('maps the monthly + annual packages with localized prices', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    const monthly = { product: { priceString: '$9.99' } };
    const annual = { product: { priceString: '$59.99' } };
    purchases.getOfferings.mockResolvedValueOnce({ current: { monthly, annual } });

    await client.initRevenueCat();
    const packages = await client.getProPackages();

    expect(packages).toEqual([
      { period: 'monthly', priceString: '$9.99', rcPackage: monthly },
      { period: 'annual', priceString: '$59.99', rcPackage: annual },
    ]);
  });

  it('returns [] when there is no current offering', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.getOfferings.mockResolvedValueOnce({ current: null });

    await client.initRevenueCat();
    await expect(client.getProPackages()).resolves.toEqual([]);
  });
});

describe('purchaseProPackage', () => {
  it('returns success when caddie_pro is active after purchase', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.purchasePackage.mockResolvedValueOnce({
      customerInfo: { entitlements: { active: { [RC_ENTITLEMENT]: { isActive: true } } } },
    });

    await expect(client.purchaseProPackage(FAKE_PKG)).resolves.toEqual({
      status: 'success',
    });
  });

  it('returns cancelled when the user backs out', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.purchasePackage.mockRejectedValueOnce({ userCancelled: true });

    await expect(client.purchaseProPackage(FAKE_PKG)).resolves.toEqual({
      status: 'cancelled',
    });
  });

  it('returns error on any other failure', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.purchasePackage.mockRejectedValueOnce(new Error('declined'));

    const outcome = await client.purchaseProPackage(FAKE_PKG);
    expect(outcome.status).toBe('error');
  });

  it('returns error when the purchase did not activate Pro', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.purchasePackage.mockResolvedValueOnce({
      customerInfo: { entitlements: { active: {} } },
    });

    const outcome = await client.purchaseProPackage(FAKE_PKG);
    expect(outcome.status).toBe('error');
  });
});

describe('restorePro', () => {
  it('returns false when the SDK is uninitialised', async () => {
    const { client, purchases } = loadFresh('');

    await expect(client.restorePro()).resolves.toBe(false);
    expect(purchases.restorePurchases).not.toHaveBeenCalled();
  });

  it('returns true when caddie_pro is active after restore', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: { [RC_ENTITLEMENT]: { isActive: true } } },
    });

    await client.initRevenueCat();
    await expect(client.restorePro()).resolves.toBe(true);
  });

  it('returns false when there is nothing to restore', async () => {
    const { client, purchases } = loadFresh('appl_FAKE_KEY');
    purchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: {} },
    });

    await client.initRevenueCat();
    await expect(client.restorePro()).resolves.toBe(false);
  });
});
