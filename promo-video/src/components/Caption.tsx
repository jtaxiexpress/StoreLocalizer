import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { CAPTION_TOP, COLORS, FONT } from "../theme";

/**
 * Headline caption, always anchored to the same top-of-frame position.
 * Rises in from below + fades in within the first ~12 frames and stays for
 * the whole beat. Pass `staticEntry` for continuation beats that share the
 * exact same text, so the caption doesn't re-animate across the cut.
 */
export const TopCaption: React.FC<{
  children: React.ReactNode;
  accent?: string;
  staticEntry?: boolean;
}> = ({ children, accent, staticEntry }) => {
  const frame = useCurrentFrame();

  const entry = staticEntry
    ? 1
    : interpolate(frame, [0, 14], [0, 1], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const y = interpolate(entry, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: CAPTION_TOP,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity: entry,
          transform: `translateY(${y}px)`,
          maxWidth: 1320,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 62,
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          color: COLORS.text,
          textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          padding: "0 60px",
        }}
      >
        {accent ? (
          <Accented text={String(children)} accent={accent} />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

// Highlights the `[bracketed]` portion of a caption with a gradient.
const Accented: React.FC<{ text: string; accent: string }> = ({
  text,
  accent,
}) => {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <span
            key={i}
            style={{
              backgroundImage: accent,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};
