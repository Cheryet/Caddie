/**
 * ProfileScreen — Screen
 * The account screen (PROJECT_SPEC §22 Phase 5.4) built as one comprehensive
 * scroll matching Design §06: identity, subscription, account, preferences,
 * notifications, support, sign-out, version.
 *
 * Wired for real: dominant hand (→ profiles.swing_hand + capture default),
 * handicap (→ profiles.handicap), default camera angle + club (→ MMKV capture
 * defaults), subscription (Manage / Upgrade), Help + Privacy links, sign-out,
 * and the pushed edit sub-pages — name (EditName), password (ChangePassword),
 * and promo/gift codes (RedeemCode). Built-but-not-yet-wired (local MMKV via
 * useProfilePrefs / "coming soon" toasts): notification + auto-analyse/pose
 * toggles, the account-settings header button, avatar.
 * Composition only — state lives in useProfile / useProfilePrefs.
 */

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, Toggle } from '@/components/ui';
import { AngleSegmented } from '@/components/swing-meta';
import { PillTab } from '@/components/swing-meta/PillTab';
import { CHROME_BG, CHROME_BORDER } from '@/components/swing-meta/tokens';
import {
  APP_STORE_SUBSCRIPTIONS_URL,
  APP_VERSION,
  HELP_URL,
  PRIVACY_URL,
} from '@/constants/config';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import type { ClubType } from '@/constants/clubs';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ClubPickerSheet } from '@/features/profile/components/ClubPickerSheet';
import { formatHandicap, parseHandicap } from '@/features/profile/handicap';
import {
  BellIcon,
  CameraIcon,
  ChartIcon,
  ClubIcon,
  DominantHandIcon,
  FlagIcon,
  HelpIcon,
  LockIcon,
  MailIcon,
  PoseFigureIcon,
  SettingsStarIcon,
  ShieldIcon,
  SparkleIcon,
  TicketIcon,
  UserIcon,
} from '@/features/profile/components/ProfileIcons';
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard';
import {
  SectionHeader,
  SettingsGroup,
  SettingsRow,
} from '@/features/profile/components/SettingsRow';
import { SignOutSheet } from '@/features/profile/components/SignOutSheet';
import { SubscriptionCard } from '@/features/profile/components/SubscriptionCard';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useProfilePrefs } from '@/features/profile/profilePrefs';
import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import { UpgradeSheet } from '@/features/subscription/components/UpgradeSheet';
import {
  loadDefaultCameraAngle,
  loadDefaultClub,
  setDefaultCameraAngle,
  setDefaultClub,
} from '@/utils/captureDefaults';
import { colors, layout, spacing, typography } from '@/theme';

import type { ProfileStackScreenProps } from '@/navigation/types';

export function ProfileScreen({ navigation }: ProfileStackScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const { isPro } = useSubscription();
  const { prefs, toggle } = useProfilePrefs();
  const { signOut } = useAuth();

  const [angle, setAngle] = useState<CameraAngle>(loadDefaultCameraAngle);
  const [club, setClub] = useState<ClubType>(loadDefaultClub);
  const [clubSheet, setClubSheet] = useState(false);
  const [signOutSheet, setSignOutSheet] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // So tapping anywhere on the Handicap row focuses its inline field (and
  // raises the numeric keyboard), not just the small input on the right edge.
  const handicapInputRef = useRef<TextInput>(null);

  const comingSoon = useCallback(
    (what: string) => () =>
      Toast.show({ message: `${what} coming soon`, variant: 'info' }),
    [],
  );

  const openLink = useCallback(
    (url: string) => () =>
      Linking.openURL(url).catch(() =>
        Toast.show({ message: 'Could not open the link.', variant: 'error' }),
      ),
    [],
  );

  const handleAngle = useCallback((next: CameraAngle) => {
    setAngle(next);
    setDefaultCameraAngle(next);
  }, []);

  const handleClub = useCallback((next: ClubType) => {
    setClub(next);
    setDefaultClub(next);
  }, []);

  const onManage = useCallback(() => {
    Linking.openURL(APP_STORE_SUBSCRIPTIONS_URL).catch(() =>
      Toast.show({ message: 'Could not open subscriptions.', variant: 'error' }),
    );
  }, []);

  const confirmSignOut = useCallback(async () => {
    setIsSigningOut(true);
    const ok = await signOut();
    // On success the root navigator swaps to the auth stack and unmounts this
    // screen; only handle the failure path here.
    if (!ok) {
      setIsSigningOut(false);
      setSignOutSheet(false);
      Toast.show({ message: 'Could not sign out. Try again.', variant: 'error' });
    }
  }, [signOut]);

  const name = profile.displayName || profile.username || 'Golfer';
  const handLabel = profile.swingHand === 'left' ? 'Left-handed' : 'Right-handed';
  const subtitle =
    profile.handicap != null
      ? `${formatHandicap(profile.handicap)} handicap · ${handLabel.toLowerCase()}`
      : handLabel;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable
          onPress={comingSoon('Account settings')}
          accessibilityRole="button"
          accessibilityLabel="Account settings"
          style={styles.headerButton}>
          <SettingsStarIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[10] },
        ]}
        showsVerticalScrollIndicator={false}>
        <ProfileIdentityCard
          name={name}
          email={profile.email}
          subtitle={subtitle}
          avatarUrl={profile.avatarUrl}
          onEdit={() => navigation.navigate('EditName')}
        />

        <SubscriptionCard
          isPro={isPro}
          onManage={onManage}
          onUpgrade={() => UpgradeSheet.show()}
        />

        <View style={styles.promoWrap}>
          <SettingsGroup>
            <SettingsRow
              icon={<TicketIcon />}
              label="Redeem promo code"
              onPress={() => navigation.navigate('RedeemCode')}
            />
          </SettingsGroup>
        </View>

        <SectionHeader title="Account" />
        <SettingsGroup>
          <SettingsRow
            icon={<UserIcon />}
            label="Full name"
            value={name}
            onPress={() => navigation.navigate('EditName')}
          />
          <SettingsRow icon={<MailIcon />} label="Email" value={profile.email ?? '—'} />
          <SettingsRow
            icon={<LockIcon />}
            label="Password"
            value="Change"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <SettingsRow
            icon={<FlagIcon />}
            label="Handicap"
            onPress={() => handicapInputRef.current?.focus()}
            right={
              <HandicapInput
                ref={handicapInputRef}
                value={profile.handicap}
                onCommit={profile.updateHandicap}
              />
            }
          />
        </SettingsGroup>

        <SectionHeader title="Preferences" />
        <SettingsGroup>
          <SettingsRow
            icon={<DominantHandIcon />}
            label="Dominant hand"
            right={
              <HandControl value={profile.swingHand} onChange={profile.updateSwingHand} />
            }
          />
          <SettingsRow
            icon={<CameraIcon />}
            label="Default camera angle"
            right={<AngleSegmented value={angle} onChange={handleAngle} />}
          />
          <SettingsRow
            icon={<ClubIcon />}
            label="Default club"
            value={club}
            onPress={() => setClubSheet(true)}
          />
          <SettingsRow
            icon={<SparkleIcon />}
            label="Auto-analyse new swings"
            right={
              <Toggle
                value={prefs.autoAnalyse}
                onValueChange={() => toggle('autoAnalyse')}
                accessibilityLabel="Auto-analyse new swings"
              />
            }
          />
          <SettingsRow
            icon={<PoseFigureIcon />}
            label="Pose overlay by default"
            right={
              <Toggle
                value={prefs.poseDefault}
                onValueChange={() => toggle('poseDefault')}
                accessibilityLabel="Pose overlay by default"
              />
            }
          />
        </SettingsGroup>

        <SectionHeader title="Notifications" />
        <SettingsGroup>
          <SettingsRow
            icon={<BellIcon />}
            label="Practice reminders"
            right={
              <Toggle
                value={prefs.practiceReminders}
                onValueChange={() => toggle('practiceReminders')}
                accessibilityLabel="Practice reminders"
              />
            }
          />
          <SettingsRow
            icon={<ChartIcon />}
            label="Weekly progress email"
            right={
              <Toggle
                value={prefs.weeklyEmail}
                onValueChange={() => toggle('weeklyEmail')}
                accessibilityLabel="Weekly progress email"
              />
            }
          />
        </SettingsGroup>

        <SectionHeader title="Support" />
        <SettingsGroup>
          <SettingsRow icon={<HelpIcon />} label="Help center" onPress={openLink(HELP_URL)} />
          <SettingsRow
            icon={<ShieldIcon />}
            label="Privacy & terms"
            onPress={openLink(PRIVACY_URL)}
          />
        </SettingsGroup>

        <Pressable
          onPress={() => setSignOutSheet(true)}
          accessibilityRole="button"
          style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.version}>Caddie v{APP_VERSION}</Text>
      </ScrollView>

      <ClubPickerSheet
        visible={clubSheet}
        value={club}
        onChange={handleClub}
        onDismiss={() => setClubSheet(false)}
      />
      <SignOutSheet
        visible={signOutSheet}
        isSigningOut={isSigningOut}
        onConfirm={confirmSignOut}
        onDismiss={() => setSignOutSheet(false)}
      />
    </View>
  );
}

// ───── Inline controls ──────────────────────────────────────────────────────

function HandControl({
  value,
  onChange,
}: {
  value: SwingHand;
  onChange: (next: SwingHand) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      <PillTab label="Right" active={value === 'right'} onPress={() => onChange('right')} />
      <PillTab label="Left" active={value === 'left'} onPress={() => onChange('left')} />
    </View>
  );
}

/**
 * Inline handicap field. Holds the raw text locally so typing feels native,
 * then commits the parsed value to `profiles.handicap` on blur/submit —
 * invalid or unchanged input never hits the network (see handicap.ts).
 */
const HandicapInput = forwardRef<
  TextInput,
  {
    value: number | null;
    onCommit: (next: number | null) => void;
  }
>(function HandicapInputImpl({ value, onCommit }, ref) {
  const [text, setText] = useState(() => formatHandicap(value));
  const focusedRef = useRef(false);

  // Mirror external changes (initial load, optimistic revert) when not editing.
  useEffect(() => {
    if (!focusedRef.current) setText(formatHandicap(value));
  }, [value]);

  const commit = () => {
    focusedRef.current = false;
    const parsed = parseHandicap(text);
    if (parsed === undefined || parsed === value) {
      // Invalid or unchanged — snap back to the stored value's canonical form.
      setText(formatHandicap(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <TextInput
      ref={ref}
      value={text}
      onChangeText={setText}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={commit}
      onSubmitEditing={commit}
      placeholder="Add"
      placeholderTextColor={colors.text.tertiary}
      keyboardType="decimal-pad"
      maxLength={4}
      returnKeyType="done"
      accessibilityLabel="Handicap"
      style={styles.handicapInput}
    />
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  title: {
    ...typography.display,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
  },
  promoWrap: {
    marginTop: spacing[4],
  },
  segmented: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  handicapInput: {
    minWidth: 56,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    paddingVertical: spacing[1],
  },
  signOut: {
    marginTop: spacing[5] + 2,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.semantic.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: colors.text.tertiary,
    marginTop: spacing[2],
  },
});
