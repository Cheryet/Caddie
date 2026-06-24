/**
 * EditScreenHeader — Component tests
 * Verifies the Cancel/Save callbacks fire, Save is inert while disabled, and
 * the Save affordance is omitted entirely when the screen has no save action
 * (Redeem code).
 */

import { fireEvent, render } from '@testing-library/react-native';

import { EditScreenHeader } from '../EditScreenHeader';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('EditScreenHeader', () => {
  it('fires onCancel and onSave', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <EditScreenHeader title="Edit name" onCancel={onCancel} onSave={onSave} />,
    );

    fireEvent.press(getByLabelText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not fire onSave while disabled', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <EditScreenHeader
        title="Edit name"
        onCancel={jest.fn()}
        onSave={onSave}
        saveDisabled
      />,
    );

    fireEvent.press(getByLabelText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('omits Save when there is no save action', () => {
    const { queryByLabelText } = render(
      <EditScreenHeader title="Redeem code" onCancel={jest.fn()} />,
    );
    expect(queryByLabelText('Save')).toBeNull();
  });
});
