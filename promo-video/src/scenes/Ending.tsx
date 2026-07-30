import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppStoreConnectLogo, GooglePlayLogo } from "../components/StoreLogos";
import { COLORS, FONT, HEIGHT, MONO, WIDTH } from "../theme";

const CX = WIDTH / 2;
const CY = HEIGHT / 2 - 30;

type Tile = { kind?: "asc" | "gp"; label?: string; tint: string; angle: number };
const TILES: Tile[] = [
  { label: "🌍  40+ languages", tint: "#6ea8ff", angle: -90 },
  { kind: "asc", tint: "#0a84ff", angle: -45 },
  { label: "🔑  ASO keywords", tint: "#f59e0b", angle: 0 },
  { label: "💸  GDP pricing", tint: "#22c55e", angle: 45 },
  { kind: "gp", tint: "#00c853", angle: 90 },
  { label: "🖼️  Screenshots", tint: "#b58cff", angle: 135 },
  { label: "🔒  100% local", tint: "#34d399", angle: 180 },
  { label: "⚡  Instant", tint: "#ff8fc7", angle: 225 },
];

const RADIUS = 380;
const CONVERGE_START = 34;
const CONVERGE_END = 66;
const BOOM = 68;

export const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Core glow grows as tiles get sucked in, then flashes at BOOM.
  const coreGrow = interpolate(frame, [CONVERGE_START, BOOM], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flash = interpolate(
    frame,
    [BOOM - 3, BOOM + 2, BOOM + 16],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Core dissolves into the flash so no white dot lingers behind the wordmark.
  const coreFade = interpolate(frame, [BOOM, BOOM + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Wordmark bursts out of the core.
  const burst = spring({
    frame: frame - (BOOM + 2),
    fps,
    config: { damping: 13, mass: 1 },
  });
  const wordScale = interpolate(burst, [0, 1], [0.2, 1]);
  const wordBlur = interpolate(frame, [BOOM + 2, BOOM + 18], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordO = interpolate(frame, [BOOM + 2, BOOM + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subO = interpolate(frame, [BOOM + 24, BOOM + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlO = interpolate(frame, [BOOM + 40, BOOM + 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* converging tiles (hidden after boom) */}
      {frame < BOOM + 2 &&
        TILES.map((t, i) => {
          const rad = (t.angle * Math.PI) / 180;
          const sx = CX + Math.cos(rad) * RADIUS;
          const sy = CY + Math.sin(rad) * RADIUS;
          const appear = interpolate(frame, [i * 3, i * 3 + 14], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const conv = interpolate(frame, [CONVERGE_START, CONVERGE_END], [0, 1], {
            easing: Easing.in(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const float = Math.sin(frame * 0.08 + i) * 6;
          const x = interpolate(conv, [0, 1], [sx, CX]);
          const y = interpolate(conv, [0, 1], [sy, CY]) + float * (1 - conv);
          const scale =
            interpolate(appear, [0, 1], [0.6, 1]) *
            interpolate(conv, [0, 1], [1, 0.12]);
          const o =
            appear *
            interpolate(conv, [0.7, 1], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%,-50%) scale(${scale})`,
                opacity: o,
                fontFamily: FONT,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.text,
                padding: t.kind ? 0 : "16px 24px",
                borderRadius: 16,
                background: t.kind ? "transparent" : `${t.tint}1f`,
                border: t.kind ? "none" : `1.5px solid ${t.tint}66`,
                whiteSpace: "nowrap",
                boxShadow: t.kind ? "none" : `0 12px 40px ${t.tint}22`,
              }}
            >
              {t.kind === "asc" ? (
                <AppStoreConnectLogo size={92} />
              ) : t.kind === "gp" ? (
                <GooglePlayLogo size={92} />
              ) : (
                t.label
              )}
            </div>
          );
        })}

      {/* core glow */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: CY,
            left: CX,
            transform: "translate(-50%,-50%)",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "white",
            opacity: coreGrow * 0.9 * coreFade,
            boxShadow: `0 0 ${60 + coreGrow * 120}px ${
              20 + coreGrow * 60
            }px rgba(124,92,255,${0.5 + coreGrow * 0.4}), 0 0 ${
              30 + coreGrow * 80
            }px ${10 + coreGrow * 40}px rgba(110,168,255,0.6)`,
          }}
        />
      </AbsoluteFill>

      {/* boom flash */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.95), rgba(180,140,255,0.4) 30%, transparent 60%)",
          opacity: flash,
        }}
      />

      {/* wordmark + CTA */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            transform: `scale(${wordScale})`,
            opacity: wordO,
            filter: `blur(${wordBlur}px)`,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              background: COLORS.grad,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              boxShadow: "0 20px 70px rgba(124,92,255,0.6)",
            }}
          >
            🌐
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              backgroundImage: COLORS.grad,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            StoreLocalizer
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            opacity: subO,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.textDim,
          }}
        >
          Free & Open Source · ⭐ Star on GitHub
        </div>
        <div
          style={{
            marginTop: 22,
            opacity: urlO,
            transform: `translateY(${interpolate(urlO, [0, 1], [18, 0])}px)`,
            fontFamily: MONO,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.gradTo,
          }}
        >
          github.com/fayharinn/StoreLocalizer
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
