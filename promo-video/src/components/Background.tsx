import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, HEIGHT, WIDTH } from "../theme";

// Deterministic starfield (seeded) so it never flickers between frames.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const STARS = Array.from({ length: 90 }, () => ({
  x: rand() * WIDTH,
  y: rand() * HEIGHT,
  r: rand() * 1.8 + 0.4,
  base: rand() * 0.5 + 0.2,
  tw: rand() * 6.28,
}));

/**
 * Branded deep-space background — radial violet/blue glows over near-black,
 * with a faint twinkling starfield. Matches the StoreLocalizer landing page.
 */
export const Background: React.FC<{ glow?: boolean }> = ({ glow = true }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      {glow && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(1200px 800px at 28% 22%, rgba(124,92,255,0.22), transparent 60%)," +
              "radial-gradient(1000px 900px at 80% 78%, rgba(110,168,255,0.16), transparent 62%)," +
              "radial-gradient(900px 700px at 60% 12%, rgba(255,143,199,0.10), transparent 60%)",
            transform: `translate(${Math.sin(frame * 0.012) * 40}px, ${
              Math.cos(frame * 0.009) * 30
            }px) scale(1.1)`,
          }}
        />
      )}
      <AbsoluteFill>
        <svg width={WIDTH} height={HEIGHT}>
          {STARS.map((s, i) => {
            const tw =
              s.base +
              0.4 * (0.5 + 0.5 * Math.sin(frame * 0.06 + s.tw));
            return (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#cdd6ff"
                opacity={interpolate(tw, [0, 1], [0, 0.9], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
              />
            );
          })}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
