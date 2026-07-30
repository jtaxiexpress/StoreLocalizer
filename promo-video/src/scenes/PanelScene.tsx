import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TopCaption } from "../components/Caption";
import { CAPTION_BAND, COLORS } from "../theme";

// Wraps a real-component panel: top caption + panel with a springy push-in
// entrance and a slow continuous float so it never feels static.
export const PanelScene: React.FC<{
  caption: string;
  children: React.ReactNode;
  scale?: number;
}> = ({ caption, children, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
  const s = interpolate(enter, [0, 1], [0.9, 1]) * scale;
  const yIn = interpolate(enter, [0, 1], [70, 0]);
  const float = Math.sin(frame * 0.045) * 7;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          paddingTop: CAPTION_BAND,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            transform: `translateY(${yIn + float}px) scale(${s})`,
            opacity: interpolate(enter, [0, 0.5], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
      <TopCaption accent={COLORS.grad}>{caption}</TopCaption>
    </AbsoluteFill>
  );
};
