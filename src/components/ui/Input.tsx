/**
 * Input — UI primitive
 * Labeled text input with focus + error states per DESIGN_SYSTEM.md §5.
 * Forwards the underlying TextInput ref so callers can `inputRef.focus()`
 * / `.blur()` programmatically (e.g. between Email and Password fields).
 *
 * Layout:
 *   Label (label typography, secondary text, above field)
 *   TextInput (48px tall, bg.input, border.default; border.strong when
 *              focused; semantic.error when `error` is set) + optional
 *              right-side adornment slot for show/hide, clear-button, etc.
 *   Helper text or error message below
 *
 * The wrapper deliberately doesn't float labels — design system §5 calls
 * that out explicitly. Labels stay above the field.
 */

import { forwardRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Shown below the field in error styling. Overrides `helper`. */
  error?: string;
  /** Shown below the field in muted styling. */
  helper?: string;
  /** Rendered absolutely on the right edge of the field (e.g. show/hide
   *  password, clear button). Reserve interaction inside its own
   *  Pressable; the field consumes touches outside of it normally. */
  rightAdornment?: ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function InputImpl(
  { label, error, helper, rightAdornment, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.fieldWrap}>
        <TextInput
          ref={ref}
          style={[
            styles.field,
            focused && styles.fieldFocused,
            error && styles.fieldError,
            rightAdornment ? styles.fieldWithAdornment : null,
          ]}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.gold.default}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightAdornment ? (
          <View style={styles.adornment}>{rightAdornment}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  fieldWrap: {
    position: 'relative',
  },
  field: {
    ...typography.body,
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    color: colors.text.primary,
  },
  fieldFocused: {
    borderColor: colors.border.strong,
  },
  fieldError: {
    borderColor: colors.semantic.error,
  },
  fieldWithAdornment: {
    paddingRight: 64,
  },
  adornment: {
    position: 'absolute',
    right: spacing[2],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  helper: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  error: {
    ...typography.caption,
    color: colors.semantic.error,
  },
});
