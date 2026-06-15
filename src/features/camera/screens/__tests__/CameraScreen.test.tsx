/**
 * CameraScreen — Screen tests
 * Exercises the four render branches by overriding the vision-camera
 * hook return values per test. Navigation prop is mocked; we only care
 * that goBack fires when Close is pressed.
 */

import { fireEvent, render } from '@testing-library/react-native';
import {
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';

import { CameraScreen } from '../CameraScreen';

type Permission = ReturnType<typeof useCameraPermission>;

interface MockNav {
  goBack: jest.Mock;
  navigate: jest.Mock;
  setOptions: jest.Mock;
  addListener: jest.Mock;
}

function makeNav(): MockNav {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
  };
}

function setCameraPermission(p: Permission) {
  (useCameraPermission as jest.Mock).mockReturnValue(p);
}
function setMicPermission(p: Permission) {
  (useMicrophonePermission as jest.Mock).mockReturnValue(p);
}
function setDevice(d: unknown) {
  (useCameraDevice as jest.Mock).mockReturnValue(d);
}

const grantedPerm: Permission = {
  status: 'authorized',
  hasPermission: true,
  canRequestPermission: false,
  requestPermission: jest.fn().mockResolvedValue(true),
};

const requestingPerm: Permission = {
  status: 'not-determined',
  hasPermission: false,
  canRequestPermission: true,
  requestPermission: jest.fn().mockResolvedValue(false),
};

const deniedPerm: Permission = {
  status: 'denied',
  hasPermission: false,
  canRequestPermission: false,
  requestPermission: jest.fn().mockResolvedValue(false),
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default to a present back camera; individual tests override.
  setDevice({ id: 'mock-back', position: 'back' });
});

describe('CameraScreen', () => {
  it('shows the denied state with Open Settings when camera is hard-denied', () => {
    setCameraPermission(deniedPerm);
    setMicPermission(requestingPerm);

    const { queryByText } = render(
      <CameraScreen navigation={makeNav() as never} route={{} as never} />,
    );

    expect(queryByText('Camera access needed')).not.toBeNull();
    expect(queryByText('Open Settings')).not.toBeNull();
  });

  it('shows the requesting (loading) state while not-determined', () => {
    setCameraPermission(requestingPerm);
    setMicPermission(requestingPerm);

    const { queryByText, UNSAFE_getByType } = render(
      <CameraScreen navigation={makeNav() as never} route={{} as never} />,
    );

    expect(queryByText('Camera access needed')).toBeNull();
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows the no-device state when permission granted but device missing', () => {
    setCameraPermission(grantedPerm);
    setMicPermission(grantedPerm);
    setDevice(undefined);

    const { queryByText } = render(
      <CameraScreen navigation={makeNav() as never} route={{} as never} />,
    );

    expect(queryByText('No camera available')).not.toBeNull();
  });

  it('renders the live preview when permission granted and device present', () => {
    setCameraPermission(grantedPerm);
    setMicPermission(grantedPerm);
    setDevice({ id: 'mock-back', position: 'back' });

    const { queryByText } = render(
      <CameraScreen navigation={makeNav() as never} route={{} as never} />,
    );

    expect(queryByText('No camera available')).toBeNull();
    expect(queryByText('Camera access needed')).toBeNull();
    // Header still mounts; Close affordance is present even over the
    // live preview.
    expect(queryByText('Close')).not.toBeNull();
  });

  it('calls navigation.goBack when Close is pressed', () => {
    setCameraPermission(grantedPerm);
    setMicPermission(grantedPerm);
    const nav = makeNav();

    const { getByText } = render(
      <CameraScreen navigation={nav as never} route={{} as never} />,
    );
    fireEvent.press(getByText('Close'));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  it('requests camera permission on mount when canRequestPermission is true', () => {
    const requestPermission = jest.fn().mockResolvedValue(true);
    setCameraPermission({ ...requestingPerm, requestPermission });
    setMicPermission(requestingPerm);

    render(<CameraScreen navigation={makeNav() as never} route={{} as never} />);

    expect(requestPermission).toHaveBeenCalled();
  });
});
