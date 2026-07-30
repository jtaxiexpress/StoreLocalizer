import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Statement } from "../components/Statement";
import { AppStoreConnectLogo, GooglePlayLogo } from "../components/StoreLogos";
import { LOCALES } from "../components/locales";
import { COLORS, FONT, HEIGHT, WIDTH } from "../theme";

// Locale chips drifting upward behind the logos.
const CHIPS = LOCALES.concat(LOCALES).map((l, i) => ({
  ...l,
  x: ((i * 137) % 100) / 100,
  delay: (i % 12) * 5,
  driftSeed: (i * 53) % 100,
}));

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ascPop = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const gpPop = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const plus = interpolate(frame, [24, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* drifting locale chips */}
      <AbsoluteFill>
        {CHIPS.map((c, i) => {
          const local = frame - c.delay;
          if (local < 0) return null;
          const prog = interpolate(local, [0, 90], [0, 1], {
            extrapolateRight: "extend",
          });
          const yTravel = (c.driftSeed / 100) * 120;
          const top = (0.15 + (c.driftSeed / 100) * 0.7) * HEIGHT - prog * yTravel;
          const o =
            interpolate(local, [0, 14], [0, 0.5], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }) *
            interpolate(local, [70, 110], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: c.x * (WIDTH - 200),
                top,
                opacity: o,
                fontFamily: FONT,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
                padding: "10px 16px",
                borderRadius: 12,
                background: `${c.tint}1a`,
                border: `1px solid ${c.tint}44`,
                whiteSpace: "nowrap",
              }}
            >
              {c.flag} {c.hi}
            </div>
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            marginBottom: 70,
          }}
        >
          <div
            style={{
              transform: `scale(${interpolate(ascPop, [0, 1], [0.5, 1])})`,
              opacity: ascPop,
              filter: "drop-shadow(0 24px 60px rgba(10,132,255,0.45))",
            }}
          >
            <AppStoreConnectLogo size={180} />
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 80,
              fontWeight: 300,
              color: COLORS.textDim,
              opacity: plus,
            }}
          >
            +
          </div>
          <div
            style={{
              transform: `scale(${interpolate(gpPop, [0, 1], [0.5, 1])})`,
              opacity: gpPop,
              filter: "drop-shadow(0 24px 60px rgba(0,200,120,0.4))",
            }}
          >
            <GooglePlayLogo size={180} />
          </div>
        </div>

        <Statement sub="App Store Connect & Google Play">
          {"[Every store.] Every language."}
        </Statement>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
