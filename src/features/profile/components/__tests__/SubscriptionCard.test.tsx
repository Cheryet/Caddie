/**
 * SubscriptionCard — Component tests
 * Verifies the Pro vs free states render the right CTA and fire the right
 * handler.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SubscriptionCard } from '../SubscriptionCard';

describe('SubscriptionCard', () => {
  it('shows Manage for Pro members', () => {
    const onManage = jest.fn();
    const { getByText, queryByText } = render(
      <SubscriptionCard isPro onManage={onManage} onUpgrade={() => {}} />,
    );
    expect(getByText('Manage subscription')).toBeTruthy();
    expect(queryByText('Upgrade to Pro')).toBeNull();
    fireEvent.press(getByText('Manage subscription'));
    expect(onManage).toHaveBeenCalled();
  });

  it('shows Upgrade for free users', () => {
    const onUpgrade = jest.fn();
    const { getByText, queryByText } = render(
      <SubscriptionCard isPro={false} onManage={() => {}} onUpgrade={onUpgrade} />,
    );
    expect(getByText('Upgrade to Pro')).toBeTruthy();
    expect(queryByText('Manage subscription')).toBeNull();
    fireEvent.press(getByText('Upgrade to Pro'));
    expect(onUpgrade).toHaveBeenCalled();
  });
});
