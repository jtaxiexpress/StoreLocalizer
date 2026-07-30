import React from "react";
import { AbsoluteFill } from "remotion";
import { Statement } from "../components/Statement";

export const StatementScene: React.FC<{
  text: string;
  sub?: string;
  size?: number;
}> = ({ text, sub, size }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Statement sub={sub} size={size}>
        {text}
      </Statement>
    </AbsoluteFill>
  </AbsoluteFill>
);
