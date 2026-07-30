import React from "react";
import { Img, staticFile } from "remotion";

/** App Store Connect — official mark. */
export const AppStoreConnectLogo: React.FC<{ size?: number }> = ({
  size = 160,
}) => (
  <Img
    src={staticFile("appstore-connect.webp")}
    style={{ width: size, height: size, display: "block" }}
  />
);

/** Google Play Console — official mark. */
export const GooglePlayLogo: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <Img
    src={staticFile("google-play.webp")}
    style={{ width: size, height: size, display: "block" }}
  />
);
