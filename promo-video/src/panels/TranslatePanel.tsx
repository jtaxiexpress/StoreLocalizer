import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Languages, Sparkles } from "lucide-react";
import { LOCALES } from "../components/locales";

const ROWS = [
  { key: "welcome.title", en: "Welcome to FitTrack" },
  { key: "goal.reached", en: "You reached today's goal! 🎉" },
  { key: "premium.upgrade", en: "Upgrade to Premium" },
];

const pop = (frame: number, at: number) =>
  interpolate(frame, [at, at + 14], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const TranslatePanel: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = LOCALES.slice(0, 6);

  return (
    <Card className="w-[780px] gradient-card p-7 shadow-2xl border-border/60">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl gradient-primary flex items-center justify-center">
            <Languages className="size-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-semibold leading-tight">
              Translations Editor
            </div>
            <div className="text-sm text-muted-foreground">
              .xcstrings · 40+ languages
            </div>
          </div>
        </div>
        <Button className="gap-2 text-base h-11 px-5">
          <Sparkles className="size-4" /> Translate
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {ROWS.map((r, ri) => (
          <div key={r.key} className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-mono text-xs text-muted-foreground">
                {r.key}
              </span>
              <span className="text-base font-medium">{r.en}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips.map((l, ci) => {
                const t = pop(frame, 6 + ri * 7 + ci * 4);
                return (
                  <Badge
                    key={l.name}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 gap-1.5 font-normal"
                    style={{
                      opacity: t,
                      transform: `scale(${t})`,
                      backgroundColor: `${l.tint}22`,
                      borderColor: `${l.tint}66`,
                      color: "var(--foreground)",
                    }}
                  >
                    <span>{l.flag}</span>
                    {l.hi}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
