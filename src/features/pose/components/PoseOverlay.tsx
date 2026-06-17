/**
 * PoseOverlay — Feature component
 * Renders the detected body-pose skeleton as an SVG layer over the
 * VideoPlayer. Purely presentational: it takes a mapped `PoseFrame` and
 * paints bones + joints, scaled into the letterboxed video rect. It
 * never intercepts touches (`pointerEvents="none"`), so tap-to-toggle
 * chrome and the drawing canvas keep working underneath.
 *
 * Per DESIGN_SYSTEM §14 + PROJECT_SPEC §22 Phase 3.2:
 *   - bones: 2px gold lines (colors.pose.bone)
 *   - joints: 6px dots (colors.pose.joint)
 *   - key joints (wrists, hips, shoulders): 8px gold (colors.pose.jointKey)
 *   - head: single translucent circle (face landmarks de-emphasised)
 *   - React.memo + returns null when there's nothing to draw
 *
 * Part of: src/features/pose/
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import {
  FACE_JOINTS,
  KEY_JOINTS,
  SKELETON_BONES,
  type PoseFrame,
  type PoseJoint,
} from '@/core/pose';
import { colors } from '@/theme';
import {
  containRect,
  projectPoint,
  type Size,
} from '@/features/pose/utils/project';

// Radii are in canvas pixels and match DESIGN_SYSTEM §14 diameters
// (6 / 8px) plus the prototype's 9px translucent head circle.
const JOINT_RADIUS = 3;
const KEY_JOINT_RADIUS = 4;
const HEAD_RADIUS = 9;
const BONE_WIDTH = 2;
const HEAD_STROKE_WIDTH = 2;

interface PoseOverlayProps {
  /** Mapped pose for the current frame; null when nothing is detected. */
  frame: PoseFrame | null;
  /** Pixel size of the overlay (the player area). */
  canvasSize: Size;
}

function PoseOverlayImpl({ frame, canvasSize }: PoseOverlayProps) {
  // Skip render when there's nothing to draw (PROJECT_SPEC §22 3.2).
  if (!frame || canvasSize.width <= 0 || canvasSize.height <= 0) return null;

  const presentJoints = Object.keys(frame.joints) as PoseJoint[];
  if (presentJoints.length === 0) return null;

  // Project every present joint into canvas pixels once.
  const rect = containRect(canvasSize, frame.aspect);
  const points = {} as Partial<Record<PoseJoint, { x: number; y: number }>>;
  for (const joint of presentJoints) {
    const point = frame.joints[joint];
    if (!point) continue;
    points[joint] = projectPoint(point.x, point.y, rect);
  }

  const head = points.nose;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* Bones — only when both endpoints are present. */}
        {SKELETON_BONES.map(([a, b], i) => {
          const pa = points[a];
          const pb = points[b];
          if (!pa || !pb) return null;
          return (
            <Line
              key={`bone-${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={colors.pose.bone}
              strokeWidth={BONE_WIDTH}
              strokeLinecap="round"
            />
          );
        })}

        {/* Joints — face landmarks are drawn as the head circle below,
            not individual dots. */}
        {presentJoints.map(joint => {
          if (FACE_JOINTS.has(joint)) return null;
          const point = points[joint];
          if (!point) return null;
          const isKey = KEY_JOINTS.has(joint);
          return (
            <Circle
              key={`joint-${joint}`}
              cx={point.x}
              cy={point.y}
              r={isKey ? KEY_JOINT_RADIUS : JOINT_RADIUS}
              fill={isKey ? colors.pose.jointKey : colors.pose.joint}
            />
          );
        })}

        {/* Head — single translucent circle anchored on the nose. */}
        {head ? (
          <Circle
            cx={head.x}
            cy={head.y}
            r={HEAD_RADIUS}
            fill={colors.pose.headFill}
            stroke={colors.pose.headStroke}
            strokeWidth={HEAD_STROKE_WIDTH}
          />
        ) : null}
      </Svg>
    </View>
  );
}

export const PoseOverlay = memo(PoseOverlayImpl);
