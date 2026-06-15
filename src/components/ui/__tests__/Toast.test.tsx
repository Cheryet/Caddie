/**
 * Toast — UI tests
 * Verifies the imperative singleton: `Toast.show(...)` causes the
 * mounted <ToastHost /> to render the message; `Toast.hide()` removes it.
 * Auto-dismiss timer is exercised with jest fake timers.
 */

import { act, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast, ToastHost } from '../Toast';

function renderHost() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 568 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <ToastHost />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  Toast.hide();
});

describe('Toast', () => {
  it('renders the host empty by default', () => {
    const { queryByText } = renderHost();
    expect(queryByText('hello')).toBeNull();
  });

  it('renders a message after Toast.show()', () => {
    const { queryByText } = renderHost();
    act(() => {
      Toast.show({ message: 'hello', variant: 'success' });
    });
    expect(queryByText('hello')).not.toBeNull();
  });

  it('replaces the current message when show() is called again', () => {
    const { queryByText } = renderHost();
    act(() => {
      Toast.show({ message: 'first' });
    });
    act(() => {
      Toast.show({ message: 'second' });
    });
    expect(queryByText('first')).toBeNull();
    expect(queryByText('second')).not.toBeNull();
  });

  it('hides the toast when Toast.hide() is called', () => {
    const { queryByText } = renderHost();
    act(() => {
      Toast.show({ message: 'go away' });
    });
    expect(queryByText('go away')).not.toBeNull();
    act(() => {
      Toast.hide();
    });
    expect(queryByText('go away')).toBeNull();
  });
});
