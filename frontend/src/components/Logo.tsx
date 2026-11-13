import { useState } from "react";

/**
 * The Jewish Board logo (The Radiant lock-up). Drop the official files into
 * frontend/public/brand/ — see frontend/public/brand/README.md. Tries SVG, then PNG; until a
 * file exists it falls back to the name set as text (never a home-made logo).
 *
 * Brand rules: min 100px wide on screen, never stretch/rotate/recolor/crop, white version on
 * dark backgrounds. The primary lock-up is ~2.2:1, so keep height >= 46px to stay >= 100px wide.
 */
const SOURCES = {
  color: ["/brand/jewish-board-logo.webp", "/brand/jewish-board-logo.svg", "/brand/jewish-board-logo.png"],
  white: [
    "/brand/jewish-board-logo-white.webp",
    "/brand/jewish-board-logo-white.svg",
    "/brand/jewish-board-logo-white.png",
  ],
};

interface Props {
  variant?: "color" | "white";
  height: number;
  fallback: React.ReactNode;
}

export function Logo({ variant = "color", height, fallback }: Props) {
  const [idx, setIdx] = useState(0);
  const src = SOURCES[variant][idx];
  if (!src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt="The Jewish Board"
      className="jb-logo"
      style={{ height }}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
