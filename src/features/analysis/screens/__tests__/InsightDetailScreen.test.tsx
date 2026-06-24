/**
 * InsightDetailScreen — Screen tests
 * useInsightFrame is mocked at the module boundary so we drive the frame
 * state without the native extractor. Asserts the insight text + position
 * always render (they come from params), the frame vs. frameless branches,
 * and the header back action.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InsightDetailScreen } from '../InsightDetailScreen';
import type { InsightFrameStatus } from '../../hooks/useInsightFrame';
import type { RootStackScreenProps } from '@/navigation/types';
import type { SwingIssue } from '@/types/analysis';

interface FrameState {
  status: InsightFrameStatus;
  frameUri: string | null;
}

jest.mock('@/features/analysis/hooks/useInsightFrame', () => {
  const state: FrameState = {
    status: 'ready',
    frameUri: 'data:image/jpeg;base64,xx',
  };
  return { useInsightFrame: () => state, __state: state };
});

const frameState = (
  jest.requireMock('@/features/analysis/hooks/useInsightFrame') as {
    __state: FrameState;
  }
).__state;

const ISSUE: SwingIssue = {
  name: 'Trail elbow flying at the top',
  severity: 'major',
  frameIndex: 3,
  description: 'Your trail arm separates from your body at the top.',
  fix: 'Tuck it on the way down — you’ll catch it flush more often.',
};

beforeEach(() => {
  frameState.status = 'ready';
  frameState.frameUri = 'data:image/jpeg;base64,xx';
});

function renderScreen() {
  const goBack = jest.fn();
  const props = {
    navigation: { goBack },
    route: { params: { videoId: 'video-1', issue: ISSUE } },
  } as unknown as RootStackScreenProps<'InsightDetail'>;
  const view = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <InsightDetailScreen {...props} />
    </SafeAreaProvider>,
  );
  return { ...view, goBack };
}

describe('InsightDetailScreen', () => {
  it('renders the name, severity, position, description and fix', () => {
    const { getByText, getByTestId } = renderScreen();
    expect(getByText(ISSUE.name)).toBeTruthy();
    expect(getByText('Major')).toBeTruthy();
    expect(getByText('Top · 4 of 8')).toBeTruthy();
    expect(getByText("What's happening")).toBeTruthy();
    expect(getByText(ISSUE.description)).toBeTruthy();
    expect(getByText('How to fix it')).toBeTruthy();
    expect(getByText(ISSUE.fix)).toBeTruthy();
    expect(getByTestId('insight-frame-image')).toBeTruthy();
  });

  it('shows the frameless fallback but keeps the insight text when the frame fails', () => {
    frameState.status = 'error';
    frameState.frameUri = null;
    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('insight-frame-fallback')).toBeTruthy();
    expect(getByText(ISSUE.fix)).toBeTruthy();
  });

  it('goes back via the header', () => {
    const { getByLabelText, goBack } = renderScreen();
    fireEvent.press(getByLabelText('Back to analysis'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
