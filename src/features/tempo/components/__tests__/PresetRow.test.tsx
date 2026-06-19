/**
 * PresetRow — Component tests
 * Verifies filled values render, empty slots are labelled, and the slot
 * press-in/out handlers fire with the slot index.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { PresetRow } from '../PresetRow';

const PRESETS = [66, null, 84, null];

describe('PresetRow', () => {
  it('renders filled values and labels empty slots', () => {
    const { getByText, getAllByLabelText } = render(
      <PresetRow
        presets={PRESETS}
        bpm={72}
        savedSlot={-1}
        onSlotDown={() => {}}
        onSlotUp={() => {}}
      />,
    );
    expect(getByText('66')).toBeTruthy();
    expect(getByText('84')).toBeTruthy();
    expect(getAllByLabelText('Empty preset slot')).toHaveLength(2);
  });

  it('fires the slot handlers with the index on press in/out', () => {
    const onSlotDown = jest.fn();
    const onSlotUp = jest.fn();
    const { getByLabelText } = render(
      <PresetRow
        presets={PRESETS}
        bpm={72}
        savedSlot={-1}
        onSlotDown={onSlotDown}
        onSlotUp={onSlotUp}
      />,
    );
    const slot = getByLabelText('Preset 66 BPM');
    fireEvent(slot, 'pressIn');
    fireEvent(slot, 'pressOut');
    expect(onSlotDown).toHaveBeenCalledWith(0);
    expect(onSlotUp).toHaveBeenCalledWith(0);
  });
});
