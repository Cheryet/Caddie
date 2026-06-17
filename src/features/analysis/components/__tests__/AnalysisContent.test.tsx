/**
 * AnalysisContent — Component tests
 * Checks the ready report composes every section (score, subtitle, coaching,
 * issues, positives, drill) and that the drill "Start" only appears with an
 * onStartDrill handler.
 */

import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisContent } from '../AnalysisContent';
import { MOCK_ANALYSIS, MOCK_SUBTITLE } from '../../mockAnalysis';

// Wrap with metrics so the provider renders children (a bare provider
// renders nothing until measured).
const renderS = (ui: ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      {ui}
    </SafeAreaProvider>,
  );

describe('AnalysisContent', () => {
  it('renders score, subtitle, coaching, issues, positives and drill', () => {
    const { getByText } = renderS(
      <AnalysisContent analysis={MOCK_ANALYSIS} subtitle={MOCK_SUBTITLE} />,
    );
    expect(getByText('78')).toBeTruthy();
    expect(getByText(MOCK_SUBTITLE)).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.summary)).toBeTruthy();
    expect(getByText('What to work on')).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.issues[0]!.name)).toBeTruthy();
    expect(getByText("What's already working")).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.positives[0]!)).toBeTruthy();
    expect(getByText('Your drill for this')).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.drill)).toBeTruthy();
  });

  it('omits the drill Start CTA when not launchable', () => {
    const { queryByText } = renderS(
      <AnalysisContent analysis={MOCK_ANALYSIS} />,
    );
    expect(queryByText('Start')).toBeNull();
  });

  it('renders the drill Start CTA when onStartDrill is provided', () => {
    const { getByText } = renderS(
      <AnalysisContent analysis={MOCK_ANALYSIS} onStartDrill={jest.fn()} />,
    );
    expect(getByText('Start')).toBeTruthy();
  });
});
