/**
 * components/ui — Barrel export
 * Single import surface for design-system primitives. Use:
 *   import { Button, Card, Toast, ... } from '@/components/ui';
 *
 * Source of truth for visual specs: DESIGN_SYSTEM.md §5.
 */

export { Avatar } from './Avatar';
export {
  Badge,
  BADGE_PALETTE,
  type BadgeVariant,
  type BadgePalette,
} from './Badge';
export { BottomSheet } from './BottomSheet';
export { Button, type ButtonSize, type ButtonVariant } from './Button';
export { Card } from './Card';
export { Divider } from './Divider';
export { EmptyState } from './EmptyState';
export { Input } from './Input';
export { ProGate } from './ProGate';
export { Skeleton } from './Skeleton';
export { Toast, ToastHost, type ToastVariant } from './Toast';
