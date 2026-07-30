import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Statement } from "../components/Statement";
import { AppStoreConnectLogo, GooglePlayLogo } from "../components/StoreLogos";
import { COLORS, FONT } from "../theme";
import { Check } from "lucide-react";

const Connected: React.FC<{ at: number; children: React.ReactNode }> = ({
  at,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 14], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = 0.4 + 0.3 * Math.sin(frame * 0.12 + at);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity: o,
        transform: `translateY(${interpolate(o, [0, 1], [30, 0])}px)`,
      }}
    >
      <div style={{ filter: `drop-shadow(0 0 ${28 * glow}px rgba(124,92,255,0.5))` }}>
        {children}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: COLORS.green,
          fontFamily: FONT,
          fontSize: 24,
          fontWeight: 600,
        }}
      >
        <Check className="size-5" /> Connected
      </div>
    </div>
  );
};

export const Payoff: React.FC = () => {
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 120, marginBottom: 64 }}>
          <Connected at={6}>
            <AppStoreConnectLogo size={150} />
          </Connected>
          <Connected at={16}>
            <GooglePlayLogo size={150} />
          </Connected>
        </div>
        <Statement sub="Translate · rank · price · design — in minutes, not weeks.">
          {"Your app, ready for [the world]."}
        </Statement>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
