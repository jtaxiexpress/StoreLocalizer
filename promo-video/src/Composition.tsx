import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";

import { Background } from "./components/Background";
import { Hook } from "./scenes/Hook";
import { StatementScene } from "./scenes/StatementScene";
import { PanelScene } from "./scenes/PanelScene";
import { ShotsShowcase } from "./scenes/ShotsShowcase";
import { Payoff } from "./scenes/Payoff";
import { Ending } from "./scenes/Ending";
import { TranslatePanel } from "./panels/TranslatePanel";
import { AsoPanel } from "./panels/AsoPanel";
import { COLORS } from "./theme";

// Each scene fades in and out against the shared background. Because scenes
// play back-to-back (no overlap), two different texts are never on screen at
// once — no ghosting — and motion stays frame-accurate.
const FADE = 11;
const SceneWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = Math.min(
    interpolate(frame, [0, FADE], [0, 1], {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [dur - FADE, dur], [1, 0], {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const SEQ: { node: React.ReactNode; dur: number }[] = [
  { node: <Hook />, dur: 104 },
  {
    node: (
      <StatementScene
        text="Going global used to take [weeks]."
        sub="Translate every string, every listing, every market…"
      />
    ),
    dur: 60,
  },
  { node: <StatementScene text="Now it takes [minutes]." size={120} />, dur: 54 },
  {
    node: (
      <PanelScene caption="Speak every customer's language">
        <TranslatePanel />
      </PanelScene>
    ),
    dur: 102,
  },
  {
    node: (
      <PanelScene caption="Get discovered in every market">
        <AsoPanel />
      </PanelScene>
    ),
    dur: 98,
  },
  { node: <ShotsShowcase />, dur: 146 },
  { node: <Payoff />, dur: 84 },
  { node: <Ending />, dur: 155 },
];

export const TOTAL_FRAMES = SEQ.reduce((a, s) => a + s.dur, 0);

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bgDeep }}>
      <Background />
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) =>
          interpolate(
            f,
            [0, 12, TOTAL_FRAMES - 28, TOTAL_FRAMES],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
      <Series>
        {SEQ.map((s, i) => (
          <Series.Sequence key={i} durationInFrames={s.dur}>
            <SceneWrap dur={s.dur}>{s.node}</SceneWrap>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
