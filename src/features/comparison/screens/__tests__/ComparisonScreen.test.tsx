/**
 * ComparisonScreen — Screen tests
 * useComparison is mocked (picker closed, two empty slots) so the screen
 * renders without the data layer. Verifies the header/back, both slots, and
 * that tapping a slot opens that side's picker.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ComparisonScreen } from '../ComparisonScreen';
import type { RootStackScreenProps } from '@/navigation/types';

// The screen imports ComparisonPickerSheet → useVideos → the supabase client,
// which throws at import without env. Stub it (the picker stays closed here).
jest.mock('@/core/supabase/client', () => ({ supabase: {} }));

interface ComparisonMockState {
  pickerOpenFor: 'A' | 'B' | null;
  openPicker: jest.Mock;
  closePicker: jest.Mock;
  chooseVideo: jest.Mock;
}

jest.mock('@/features/comparison/hooks/useComparison', () => {
  const emptyPanel = () => ({
    videoId: null,
    status: 'empty',
    uri: null,
    label: null,
    isPlaying: false,
    currentMs: 0,
    durationMs: 0,
    rate: 0.5,
    play: jest.fn(),
    pause: jest.fn(),
    toggle: jest.fn(),
    seekMs: jest.fn(),
    setRate: jest.fn(),
    setProgress: jest.fn(),
    setDuration: jest.fn(),
    onEnd: jest.fn(),
  });
  const state: ComparisonMockState = {
    pickerOpenFor: null,
    openPicker: jest.fn(),
    closePicker: jest.fn(),
    chooseVideo: jest.fn(),
  };
  return {
    useComparison: () => ({
      panelA: emptyPanel(),
      panelB: emptyPanel(),
      playerRefA: { current: null },
      playerRefB: { current: null },
      ...state,
    }),
    __state: state,
  };
});

const cmpState = (
  jest.requireMock('@/features/comparison/hooks/useComparison') as {
    __state: ComparisonMockState;
  }
).__state;

function renderScreen() {
  const goBack = jest.fn();
  const props = {
    navigation: { goBack },
    route: { params: undefined },
  } as unknown as RootStackScreenProps<'Comparison'>;
  const view = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <ComparisonScreen {...props} />
    </SafeAreaProvider>,
  );
  return { ...view, goBack };
}

beforeEach(() => {
  cmpState.pickerOpenFor = null;
  cmpState.openPicker = jest.fn();
  cmpState.closePicker = jest.fn();
  cmpState.chooseVideo = jest.fn();
});

describe('ComparisonScreen', () => {
  it('renders the header and both empty slots', () => {
    const { getByText } = renderScreen();
    expect(getByText('Compare')).toBeTruthy();
    expect(getByText('Swing A')).toBeTruthy();
    expect(getByText('Swing B')).toBeTruthy();
  });

  it('closes via the header back button', () => {
    const { getByLabelText, goBack } = renderScreen();
    fireEvent.press(getByLabelText('Close comparison'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('opens each slot picker', () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Pick Swing A'));
    fireEvent.press(getByLabelText('Pick Swing B'));
    expect(cmpState.openPicker).toHaveBeenCalledWith('A');
    expect(cmpState.openPicker).toHaveBeenCalledWith('B');
  });
});
