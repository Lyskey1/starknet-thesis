/**
 * The STRK flywheel from /strk's section 01, as a static snapshot: the same
 * geometry (track, dashed accent ring, four spokes, the hub with the
 * Starknet mark, the four stage dots and labels), none of the page's
 * interactivity (no orbiting dot, no hover card). Styled by landing.css with
 * the strk page's own values.
 */
const STAGES = [
  { n: "01", label: "Thesis", x: 200, y: 70, ly: 44, ny: 75 },
  { n: "02", label: "Utility", x: 330, y: 200, ly: 234, ny: 205 },
  { n: "03", label: "Demand", x: 200, y: 330, ly: 360, ny: 335 },
  { n: "04", label: "Security", x: 70, y: 200, ly: 234, ny: 205 },
] as const;

export const Flywheel = () => (
  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The STRK flywheel: thesis, utility, demand, security, in a loop around the STRK hub">
    <defs>
      <clipPath id="lpHubLogoClip"><circle cx="200" cy="200" r="24" /></clipPath>
    </defs>
    <circle className="track" cx="200" cy="200" r="130" />
    <circle className="track-dash" cx="200" cy="200" r="130" />
    <line className="spoke" x1="200" y1="200" x2="200" y2="70" />
    <line className="spoke" x1="200" y1="200" x2="330" y2="200" />
    <line className="spoke" x1="200" y1="200" x2="200" y2="330" />
    <line className="spoke" x1="200" y1="200" x2="70" y2="200" />
    <g className="hub">
      <circle cx="200" cy="200" r="40" />
      <image x="176" y="176" width="48" height="48" clipPath="url(#lpHubLogoClip)" preserveAspectRatio="xMidYMid slice" href="/assets/starknet-logo.png" aria-hidden="true" />
    </g>
    {STAGES.map((s) => (
      <g className="stage" key={s.n}>
        <circle className="dot" cx={s.x} cy={s.y} r="13" />
        <text className="snum" x={s.x} y={s.ny}>{s.n}</text>
        <text className="slabel" x={s.x} y={s.ly}>{s.label}</text>
      </g>
    ))}
  </svg>
);
