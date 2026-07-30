import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { PhoneMock } from "../components/PhoneMock";
import { TopCaption } from "../components/Caption";
import { CAPTION_BAND, COLORS, FONT } from "../theme";

// A bilingual headline that swaps EN -> FR around `at` (slide up + crossfade).
const Headline: React.FC<{ en: string; fr: string; at: number }> = ({
  en,
  fr,
  at,
}) => {
  const frame = useCurrentFrame();
  const swap = interpolate(frame, [at, at + 16], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "relative", height: 96, width: "100%" }}>
      {/* flag pill */}
      <div
        style={{
          position: "absolute",
          top: -42,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 26,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(0,0,0,0.28)",
          borderRadius: 999,
          padding: "4px 14px",
        }}
      >
        {swap < 0.5 ? "🇬🇧 EN" : "🇫🇷 FR"}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#fff",
          textShadow: "0 3px 18px rgba(0,0,0,0.35)",
          opacity: 1 - swap,
          transform: `translateY(${interpolate(swap, [0, 1], [0, -26])}px)`,
        }}
      >
        {en}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#fff",
          textShadow: "0 3px 18px rgba(0,0,0,0.35)",
          opacity: swap,
          transform: `translateY(${interpolate(swap, [0, 1], [26, 0])}px)`,
        }}
      >
        {fr}
      </div>
    </div>
  );
};

const Shot: React.FC<{
  grad: string;
  en: string;
  fr: string;
  at: number;
  appearAt: number;
  children: React.ReactNode;
  screenBg: string;
}> = ({ grad, en, fr, at, appearAt, children, screenBg }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [appearAt, appearAt + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: 452,
        height: 760,
        borderRadius: 32,
        background: grad,
        padding: "70px 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 40px 110px rgba(0,0,0,0.5)",
        opacity: enter,
        transform: `translateY(${
          interpolate(enter, [0, 1], [60, 0]) +
          Math.sin(frame * 0.05 + appearAt) * 9
        }px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
      }}
    >
      <Headline en={en} fr={fr} at={at} />
      <div style={{ marginTop: 18 }}>
        <PhoneMock width={290} screenBg={screenBg}>
          {children}
        </PhoneMock>
      </div>
    </div>
  );
};

// --- App screens (pretty, distinct) -------------------------------------
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: "rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: 14,
      ...style,
    }}
  >
    {children}
  </div>
);

const FitnessScreen = () => (
  <div style={{ padding: 18, color: "#fff", fontFamily: FONT }}>
    <div style={{ fontSize: 12, opacity: 0.7 }}>Good morning, Alex</div>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>
      Today
    </div>
    <Card style={{ textAlign: "center", padding: 20, marginBottom: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>Calories</div>
      <div style={{ fontSize: 46, fontWeight: 900, color: "#fde047" }}>486</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>of 600 kcal</div>
    </Card>
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <Card style={{ flex: 1 }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>Steps</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>9,214</div>
      </Card>
      <Card style={{ flex: 1 }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>Active</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>52 min</div>
      </Card>
    </div>
    <div
      style={{
        background: "#fff",
        color: "#7c3aed",
        borderRadius: 14,
        padding: "12px 0",
        textAlign: "center",
        fontWeight: 800,
        fontSize: 15,
      }}
    >
      Start workout
    </div>
  </div>
);

const StreakScreen = () => (
  <div style={{ padding: 18, color: "#fff", fontFamily: FONT }}>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>
      Progress
    </div>
    <Card style={{ textAlign: "center", padding: 20, marginBottom: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.8 }}>🔥 Current streak</div>
      <div style={{ fontSize: 46, fontWeight: 900 }}>28</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>days in a row</div>
    </Card>
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
        {[40, 62, 50, 80, 70, 95, 60].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: "rgba(255,255,255,0.85)",
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </Card>
    <div style={{ fontSize: 12, opacity: 0.85 }}>This week · +18% vs last</div>
  </div>
);

const MeditateScreen = () => (
  <div
    style={{
      padding: 18,
      color: "#fff",
      fontFamily: FONT,
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
      Relax
    </div>
    <div
      style={{
        alignSelf: "center",
        width: 150,
        height: 150,
        borderRadius: "50%",
        border: "10px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 900 }}>12:00</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>Breathing</div>
      </div>
    </div>
    <Card style={{ marginBottom: 10 }}>🌙 Sleep · 8 sessions</Card>
    <Card>🎧 Focus · 12 sessions</Card>
  </div>
);

export const ShotsShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          paddingTop: CAPTION_BAND - 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          <Shot
            appearAt={4}
            at={56}
            en="Crush every goal"
            fr="Atteignez chaque objectif"
            grad="linear-gradient(160deg, #7c3aed, #6d28d9)"
            screenBg="linear-gradient(160deg, #8b5cf6, #6d28d9)"
          >
            <FitnessScreen />
          </Shot>
          <Shot
            appearAt={12}
            at={64}
            en="See your progress"
            fr="Visualisez vos progrès"
            grad="linear-gradient(160deg, #0ea5e9, #0369a1)"
            screenBg="linear-gradient(160deg, #38bdf8, #0369a1)"
          >
            <StreakScreen />
          </Shot>
          <Shot
            appearAt={20}
            at={72}
            en="Find your calm"
            fr="Trouvez votre calme"
            grad="linear-gradient(160deg, #ec4899, #be185d)"
            screenBg="linear-gradient(160deg, #f472b6, #be185d)"
          >
            <MeditateScreen />
          </Shot>
        </div>
      </AbsoluteFill>

      <TopCaption accent={COLORS.grad}>
        {"Beautiful screenshots, [in every language]"}
      </TopCaption>
    </AbsoluteFill>
  );
};
