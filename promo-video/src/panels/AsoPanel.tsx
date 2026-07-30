import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus } from "lucide-react";

type Row = {
  kw: string;
  pop: number;
  diff: number;
  verdict: "Great" | "OK" | "Weak" | "Hard";
};
const ROWS: Row[] = [
  { kw: "home workout", pop: 72, diff: 38, verdict: "Great" },
  { kw: "weight loss app", pop: 68, diff: 55, verdict: "OK" },
  { kw: "hiit timer", pop: 61, diff: 22, verdict: "Great" },
  { kw: "step counter", pop: 58, diff: 47, verdict: "OK" },
  { kw: "strength training log", pop: 49, diff: 18, verdict: "Great" },
];

const VERDICT: Record<Row["verdict"], { bg: string; fg: string }> = {
  Great: { bg: "#22c55e22", fg: "#22c55e" },
  OK: { bg: "#3b82f622", fg: "#60a5fa" },
  Weak: { bg: "#e0982a22", fg: "#e0982a" },
  Hard: { bg: "#ef444422", fg: "#f87171" },
};

export const AsoPanel: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Card className="w-[760px] gradient-card p-7 shadow-2xl border-border/60">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-11 rounded-xl bg-orange-500 flex items-center justify-center">
          <TrendingUp className="size-6 text-white" />
        </div>
        <div>
          <div className="text-xl font-semibold leading-tight">
            AppCompete Suggestions
          </div>
          <div className="text-sm text-muted-foreground">
            English (U.S.) — ranked by opportunity
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between px-2 text-xs text-muted-foreground font-medium">
        <span>Keyword</span>
        <div className="flex gap-10">
          <span>Pop</span>
          <span>Diff</span>
        </div>
      </div>

      <div className="mt-2 flex flex-col">
        {ROWS.map((r, i) => {
          const enter = interpolate(frame, [10 + i * 7, 24 + i * 7], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const v = VERDICT[r.verdict];
          return (
            <div
              key={r.kw}
              className="flex items-center justify-between py-3 px-2 border-b border-border/40"
              style={{
                opacity: enter,
                transform: `translateX(${interpolate(enter, [0, 1], [24, 0])}px)`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-medium">{r.kw}</span>
                <Badge
                  variant="secondary"
                  className="text-xs py-0.5 px-2 font-medium"
                  style={{ backgroundColor: v.bg, color: v.fg, borderColor: `${v.fg}55` }}
                >
                  {r.verdict}
                </Badge>
              </div>
              <div className="flex gap-10 font-mono text-base">
                <span className="text-emerald-400 w-8 text-right">{r.pop}</span>
                <span className="text-amber-400 w-8 text-right">{r.diff}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="gap-2 text-base h-11 px-5 bg-orange-500 hover:bg-orange-500 text-white">
          <Plus className="size-4" /> Apply Keywords
        </Button>
      </div>
    </Card>
  );
};
