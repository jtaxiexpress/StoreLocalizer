import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";

type Word = { w: string; accent: boolean };
function tokenize(text: string): Word[] {
  const out: Word[] = [];
  let inB = false;
  for (const raw of text.split(" ")) {
    let w = raw;
    if (w.includes("[")) {
      inB = true;
      w = w.replace("[", "");
    }
    const accent = inB;
    if (w.includes("]")) {
      w = w.replace("]", "");
      inB = false;
    }
    out.push({ w, accent });
  }
  return out;
}

// Big centered emotional line. Words rise + fade in with a stagger;
// `[bracketed]` words get the brand gradient.
export const Statement: React.FC<{
  children: string;
  sub?: string;
  size?: number;
}> = ({ children, sub, size = 96 }) => {
  const frame = useCurrentFrame();
  const words = tokenize(children);

  const subO = interpolate(frame, [18 + words.length * 3, 34 + words.length * 3], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONT,
        textAlign: "center",
        maxWidth: 1500,
        padding: "0 80px",
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: COLORS.text,
        }}
      >
        {words.map((word, i) => {
          const at = i * 3.5;
          const e = interpolate(frame, [at, at + 16], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: e,
                transform: `translateY(${interpolate(e, [0, 1], [44, 0])}px)`,
                ...(word.accent
                  ? {
                      backgroundImage: COLORS.grad,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }
                  : {}),
              }}
            >
              {word.w}
            </span>
          );
        })}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            fontWeight: 500,
            color: COLORS.textDim,
            opacity: subO,
            transform: `translateY(${interpolate(subO, [0, 1], [20, 0])}px)`,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
