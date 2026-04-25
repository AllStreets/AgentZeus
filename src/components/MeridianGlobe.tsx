"use client";

/**
 * Globe with grid lines and 3 location pins.
 * Matches the localization icon reference.
 * Used for Meridian agent in constellation, panel header, and sidebar.
 */
export default function MeridianGlobe({
  size = 18,
  color = "#00d4ff",
  strokeOpacity = 1,
  fillOpacity = 0.15,
}: {
  size?: number;
  color?: string;
  strokeOpacity?: number;
  fillOpacity?: number;
}) {
  const so = strokeOpacity;
  const fo = fillOpacity;
  const lw = 2.8; // grid line width
  const pinFill = Math.min(fo * 4, 0.9);

  return (
    <svg viewBox="0 0 90 82" width={size} height={size * 82 / 90}>
      {/* Globe circle */}
      <circle cx="38" cy="42" r="35" fill={color} fillOpacity={fo} stroke={color} strokeWidth="2" strokeOpacity={so} />

      {/* Grid lines — latitude (horizontal curves) */}
      <path d="M 5 28 Q 38 20 71 28" fill="none" stroke={color} strokeWidth={lw} strokeOpacity={so * 0.7} strokeLinecap="round" />
      <path d="M 3 42 Q 38 36 73 42" fill="none" stroke={color} strokeWidth={lw} strokeOpacity={so * 0.55} strokeLinecap="round" />
      <path d="M 5 56 Q 38 62 71 56" fill="none" stroke={color} strokeWidth={lw} strokeOpacity={so * 0.7} strokeLinecap="round" />

      {/* Grid lines — meridian (vertical ellipse) */}
      <ellipse cx="38" cy="42" rx="14" ry="35" fill="none" stroke={color} strokeWidth={lw} strokeOpacity={so * 0.6} />

      {/* Large pin — upper right, extends outside globe */}
      <path
        d="M 66 10 C 60 10, 55 15, 55 21 C 55 28, 66 38, 66 38 C 66 38, 77 28, 77 21 C 77 15, 72 10, 66 10 Z"
        fill={color} fillOpacity={pinFill} stroke={color} strokeWidth="2" strokeOpacity={so}
      />
      <circle cx="66" cy="20" r="4.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity={so} />
      <circle cx="66" cy="20" r="1.5" fill={color} fillOpacity={so * 0.8} />

      {/* Medium pin — center left */}
      <path
        d="M 20 36 C 16 36, 12 39, 12 43 C 12 48, 20 55, 20 55 C 20 55, 28 48, 28 43 C 28 39, 24 36, 20 36 Z"
        fill={color} fillOpacity={pinFill} stroke={color} strokeWidth="1.8" strokeOpacity={so}
      />
      <circle cx="20" cy="42" r="3.5" fill="none" stroke={color} strokeWidth="1.8" strokeOpacity={so} />
      <circle cx="20" cy="42" r="1.2" fill={color} fillOpacity={so * 0.8} />

      {/* Small pin — bottom center */}
      <path
        d="M 42 58 C 39 58, 37 60, 37 63 C 37 66, 42 71, 42 71 C 42 71, 47 66, 47 63 C 47 60, 45 58, 42 58 Z"
        fill={color} fillOpacity={pinFill} stroke={color} strokeWidth="1.5" strokeOpacity={so}
      />
      <circle cx="42" cy="62" r="1.5" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity={so} />
    </svg>
  );
}
