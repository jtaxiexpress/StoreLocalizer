import React from "react";

/** A clean iPhone-style device frame with dynamic island + status bar. */
export const PhoneMock: React.FC<{
  width?: number;
  screenBg: string;
  children: React.ReactNode;
}> = ({ width = 300, screenBg, children }) => {
  const h = width * 2.05;
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: width * 0.16,
        background: "#0a0a0c",
        padding: width * 0.03,
        boxShadow:
          "0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: width * 0.13,
          overflow: "hidden",
          position: "relative",
          background: screenBg,
        }}
      >
        {/* status bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: width * 0.16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${width * 0.08}px`,
            color: "#fff",
            fontSize: width * 0.05,
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <span>9:41</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: width * 0.02 }}>
            <span
              style={{
                width: width * 0.07,
                height: width * 0.035,
                borderRadius: 3,
                border: "1.5px solid rgba(255,255,255,0.85)",
                position: "relative",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 1.5,
                  background: "#fff",
                  borderRadius: 1,
                }}
              />
            </span>
          </span>
        </div>
        {/* dynamic island */}
        <div
          style={{
            position: "absolute",
            top: width * 0.05,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.34,
            height: width * 0.1,
            borderRadius: 999,
            background: "#000",
            zIndex: 4,
          }}
        />
        {/* content */}
        <div style={{ position: "absolute", inset: 0, paddingTop: width * 0.2 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
