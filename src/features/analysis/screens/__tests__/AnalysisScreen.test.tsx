/**
 * AnalysisScreen — Screen tests
 * useAnalysis + useSubscription are mocked at the module boundary so we can
 * drive the Pro gate and each analysis state without the data layer. Asserts
 * the gate for free users, the report for Pro users, the loading/error
 * branches, and the header back action.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisScreen } from '../AnalysisScreen';
import { MOCK_ANALYSIS } from '../../__fixtures__/analysis';
import type { AnalysisError } from '../../parseAnalysis';
import type { AnalysisStatus } from '../../hooks/useAnalysis';
import type { SwingAnalysis } from '@/types/analysis';
import type { RootStackScreenProps } from '@/navigation/types';

interface AnalysisHookState {
  status: AnalysisStatus;
  analysis: SwingAnalysis | null;
  subtitle: string | null;
  error: AnalysisError | null;
  refresh: jest.Mock;
}

jest.mock('@/features/analysis/hooks/useAnalysis', () => {
  const { MOCK_ANALYSIS: analysis } = require('../../__fixtures__/analysis');
  const state: AnalysisHookState = {
    status: 'ready',
    analysis,
    subtitle: 'Driver · Today',
    error: null,
    refresh: jest.fn(),
  };
  return { useAnalysis: () => state, __state: state };
});

jest.mock('@/features/subscription/hooks/useSubscription', () => {
  const state = { isPro: true };
  return { useSubscription: () => state, __state: state };
});

const hookState = (
  jest.requireMock('@/features/analysis/hooks/useAnalysis') as {
    __state: AnalysisHookState;
  }
).__state;
const subState = (
  jest.requireMock('@/features/subscription/hooks/useSubscription') as {
    __state: { isPro: boolean };
  }
).__state;

beforeEach(() => {
  hookState.status = 'ready';
  hookState.analysis = MOCK_ANALYSIS;
  hookState.subtitle = 'Driver · Today';
  hookState.error = null;
  hookState.refresh = jest.fn();
  subState.isPro = true;
});

function renderScreen() {
  const goBack = jest.fn();
  const navigate = jest.fn();
  const props = {
    navigation: { goBack, navigate },
    route: { params: { videoId: 'video-1' } },
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
  return { ...view, goBack, navigate };
}

describe('AnalysisScreen', () => {
  it('shows the Pro gate for free users', () => {
    subState.isPro = false;
    const { getByText, queryByText } = renderScreen();
    expect(getByText('AI Coaching')).toBeTruthy();
    expect(getByText('Upgrade to Pro')).toBeTruthy();
    // The report must not render for free users.
    expect(queryByText('78')).toBeNull();
  });

  it('renders the report for Pro users when ready', () => {
    const { getByText } = renderScreen();
    expect(getByText('Swing analysis')).toBeTruthy();
    expect(getByText('78')).toBeTruthy();
    expect(getByText(MOCK_ANALYSIS.issues[0]!.name)).toBeTruthy();
  });

  it('renders the loading state while analysing', () => {
    hookState.status = 'analyzing';
    hookState.analysis = null;
    const { getByText } = renderScreen();
    expect(getByText('Analysing your swing')).toBeTruthy();
  });

  it('renders a retryable error with a Try again CTA', () => {
    hookState.status = 'error';
    hookState.analysis = null;
    hookState.error = {
      code: 'network',
      message: 'Analysis timed out. Check your connection and try again.',
      retryable: true,
    };
    const { getByText } = renderScreen();
    expect(getByText('Connection problem')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('omits Try again for the daily-limit error', () => {
    hookState.status = 'error';
    hookState.analysis = null;
    hookState.error = {
      code: 'rate_limited',
      message: "You've used all 10 analyses for today. Come back tomorrow.",
      retryable: false,
    };
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Daily limit reached')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
  });

  it('closes via the header back button', () => {
    const { getByLabelText, goBack } = renderScreen();
    fireEvent.press(getByLabelText('Close analysis'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to the insight detail when an issue is tapped', () => {
    const { getByLabelText, navigate } = renderScreen();
    const issue = MOCK_ANALYSIS.issues[0]!;
    fireEvent.press(getByLabelText(`See ${issue.name} in detail`));
    expect(navigate).toHaveBeenCalledWith('InsightDetail', {
      videoId: 'video-1',
      issue,
    });
  });
});
