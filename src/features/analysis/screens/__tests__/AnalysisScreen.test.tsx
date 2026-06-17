/**
 * AnalysisScreen — Screen tests
 * Drives the three states through the __DEV__ switcher (enabled under jest's
 * __DEV__) and verifies the header back action. Mock data is the screen's own
 * source in Phase 4.3, so no hook/network mocking is needed.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisScreen } from '../AnalysisScreen';
import { MOCK_ANALYSIS } from '../../mockAnalysis';
import type { RootStackScreenProps } from '@/navigation/types';

function renderScreen() {
  const goBack = jest.fn();
  // Minimal nav/route mock — the screen only calls navigation.goBack.
  const props = {
    navigation: { goBack },
    route: { params: { videoId: 'v1' } },
  } as unknown as RootStackScreenProps<'Analysis'>;
  const view = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <AnalysisScreen {...props} />
    </SafeAreaProvider>,
  );
  return { ...view, goBack };
}

describe('AnalysisScreen', () => {
  it('renders the ready report by default', () => {
    const { getByText } = renderScreen();
    expect(getByText('Swing analysis')).toBeTruthy();
    expect(getByText('78')).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.issues[0]!.name)).toBeTruthy();
  });

  it('switches to the loading state via the dev switcher', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('loading'));
    expect(getByText('Analysing your swing')).toBeTruthy();
  });

  it('switches to the error state via the dev switcher', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('error'));
    expect(getByText("Analysis didn't go through")).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('closes via the header back button', () => {
    const { getByLabelText, goBack } = renderScreen();
    fireEvent.press(getByLabelText('Close analysis'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
