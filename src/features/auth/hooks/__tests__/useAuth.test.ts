/**
 * useAuth — hook tests
 * Verify state transitions for every flow the hook drives. The Supabase
 * auth wrapper is mocked at the module boundary so these tests never
 * touch the network and don't depend on env values.
 */

import { act, renderHook } from '@testing-library/react-native';

import type { AuthError } from '@/core/supabase/auth';
import { useAppStore } from '@/store/useAppStore';

// Explicit factory prevents the real module loading — its supabase
// client import would otherwise throw on missing env at module init.
jest.mock('@/core/supabase/auth', () => ({
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  requestMagicLink: jest.fn(),
  verifyOtp: jest.fn(),
  resendOtp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
}));
import * as authService from '@/core/supabase/auth';

import { useAuth } from '../useAuth';

const mockUser = { id: 'user-1', email: 'a@b.com' } as never;
const mockSession = { access_token: 't', user: mockUser } as never;

function asMock<T extends keyof typeof authService>(name: T) {
  return authService[name] as unknown as jest.Mock;
}

beforeEach(() => {
  // Reset Zustand store between tests so user state doesn't leak.
  useAppStore.setState({
    user: null,
    isAuthLoading: false,
    isPro: false,
    theme: 'dark',
  });
  jest.clearAllMocks();
});

describe('useAuth.signIn', () => {
  it('sets the user on success and returns true', async () => {
    asMock('signInWithPassword').mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.signIn('a@b.com', 'password123');
    });

    expect(ok).toBe(true);
    expect(useAppStore.getState().user).toBe(mockUser);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('surfaces an error and leaves user null on failure', async () => {
    const error: AuthError = {
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    };
    asMock('signInWithPassword').mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.signIn('a@b.com', 'wrong');
    });

    expect(ok).toBe(false);
    expect(useAppStore.getState().user).toBeNull();
    expect(result.current.error).toEqual(error);
  });
});

describe('useAuth.signUp', () => {
  it('returns needsVerification=true when Supabase requires confirmation', async () => {
    asMock('signUp').mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let res;
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'password123');
    });

    expect(res).toEqual({ needsVerification: true });
    // Session is null so we don't set the user yet — Verify screen handles it.
    expect(useAppStore.getState().user).toBeNull();
  });

  it('signs the user straight in when Supabase returns a session', async () => {
    asMock('signUp').mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let res;
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'password123');
    });

    expect(res).toEqual({ needsVerification: false });
    expect(useAppStore.getState().user).toBe(mockUser);
  });

  it('returns null and sets error on failure', async () => {
    const error: AuthError = {
      code: 'user_already_exists',
      message: 'An account already exists with that email.',
    };
    asMock('signUp').mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useAuth());

    let res;
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'password123');
    });

    expect(res).toBeNull();
    expect(result.current.error).toEqual(error);
  });
});

describe('useAuth.verifyMagicCode', () => {
  it('sets the user on successful verify', async () => {
    asMock('verifyOtp').mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.verifyMagicCode('a@b.com', '123456', 'signup');
    });

    expect(ok).toBe(true);
    expect(useAppStore.getState().user).toBe(mockUser);
  });

  it('surfaces invalid_otp error and keeps user null', async () => {
    const error: AuthError = {
      code: 'invalid_otp',
      message: 'That code is invalid or expired.',
    };
    asMock('verifyOtp').mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.verifyMagicCode('a@b.com', '000000', 'magiclink');
    });

    expect(ok).toBe(false);
    expect(useAppStore.getState().user).toBeNull();
    expect(result.current.error).toEqual(error);
  });
});

describe('useAuth.signOut', () => {
  it('clears the user on success', async () => {
    useAppStore.setState({ user: mockUser });
    asMock('signOut').mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.signOut();
    });

    expect(ok).toBe(true);
    expect(useAppStore.getState().user).toBeNull();
  });

  it('keeps the user and surfaces error on failure', async () => {
    useAppStore.setState({ user: mockUser });
    const error: AuthError = { code: 'network', message: 'Network error.' };
    asMock('signOut').mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.signOut();
    });

    expect(ok).toBe(false);
    expect(useAppStore.getState().user).toBe(mockUser);
    expect(result.current.error).toEqual(error);
  });
});

describe('useAuth.requestMagicLink + resendCode', () => {
  it('returns true on magic link request success', async () => {
    asMock('requestMagicLink').mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.requestMagicLink('a@b.com');
    });

    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('routes signup resend through resendOtp', async () => {
    asMock('resendOtp').mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAuth());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.resendCode('a@b.com', 'signup');
    });

    expect(ok).toBe(true);
    expect(asMock('resendOtp')).toHaveBeenCalledWith('a@b.com', 'signup');
  });
});

describe('useAuth.clearError', () => {
  it('clears a previously set error', async () => {
    const error: AuthError = { code: 'invalid_credentials', message: 'no' };
    asMock('signInWithPassword').mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('a@b.com', 'x');
    });
    expect(result.current.error).toEqual(error);

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
