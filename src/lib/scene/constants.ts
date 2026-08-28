/**
 * Scene constants that live outside CSS.
 *
 * Originally ported from the source scenes (`orb.html`, `spiral-galaxy.html`),
 * since retuned via the colour panel (see `lib/scene/color-store.ts`). They are
 * WebGL colours, not styles — they cannot reference a CSS custom property.
 * `ORB.bg` also seeds the canvas clear colour; it is only visible for one frame
 * before the backdrop draws, so it need not match `--color-void` in
 * `globals.css` (the page background) exactly, though keeping them close avoids a
 * first-paint flash.
 */

export interface ScenePalette {
  bg: string;
  flameA: string;
  flameB: string;
  flameAmt: number;
  atmo: string;
  /** Camera-attached mote spread, in world units. */
  atmoSpread: number;
  /** Radius at which motes begin / finish fading out. */
  atmoFadeNear: number;
  atmoFadeFar: number;
  atmoAlpha: number;
}

/** Ice-blue → indigo jewel. The hero form. */
export const ORB: ScenePalette = {
  bg: "#000000",
  flameA: "#c53400",
  flameB: "#ff8a4a",
  flameAmt: 0.5,
  atmo: "#ffb08a",
  atmoSpread: 2.2,
  atmoFadeNear: 2.0,
  atmoFadeFar: 3.2,
  atmoAlpha: 0.5,
};

/** Blue core → mint arms. The second scene. */
export const GALAXY: ScenePalette = {
  bg: "#000000",
  flameA: "#c53400",
  flameB: "#ff8a4a",
  flameAmt: 0.195,
  atmo: "#ffb08a",
  atmoSpread: 4.0,
  atmoFadeNear: 5.0,
  atmoFadeFar: 6.5,
  atmoAlpha: 0.6,
};

/** Canvas clear colour. Behind the backdrop, so only seen for the first frame. */
export const SCENE_BACKGROUND = ORB.bg;

/** Orb form. */
export const ORB_CONFIG = {
  colorTop: "#fafafa",
  colorBottom: "#c53400",
  colorEdge: "#a02a00",
  deform: 0.135,
  brightness: 1.24,
  opacity: 1,
  spin: 0.17,
  tilt: 0.39,
  pointerRadius: 1.76,
  oilBulge: 0.46,
  oilRipple: 0.34,
  oilDrag: 0.95,
  rippleFreq: 11,
  rippleSpeed: 4,
  iridescence: 0.6,
  /** Radius of the point sphere, in world units. */
  radius: 1,
  /** World units the orb rushes toward the camera across "Enter the unknown". */
  approach: 2.6,
  /** How much the displacement noise swells as the orb approaches (× deform). */
  distortGain: 3.4,
} as const;

/**
 * The second act's figure: Privacy, staged as a dense point-cloud bust
 * instead of the spiral this file used to describe. `colorEdge` (crown) /
 * `colorCore` (ground) is a vertical gradient now, not a radial one, see
 * `galaxy-shaders.ts`. The distances below (`cameraZ`, `dive`, `parallax`,
 * `pointerRadius`) are sized for a bust about one world unit tall, not a
 * galaxy spanning ninety.
 */
export const GALAXY_CONFIG = {
  colorEdge: "#fafafa",
  colorCore: "#c53400",
  opacity: 0.4,
  pointSize: 0.6,
  brightness: 0.35,
  armSpin: 0.4,
  tilt: -0.5,
  scale: 1,
  /** World units the bust sits below the camera's (0,0,0) look-at point, so
   *  its geometric centre (above 0, since it's shoulders-up) lands at
   *  screen-centre instead of riding high enough to crowd the title above. */
  offsetY: -0.25,
  cameraZ: 3.2,
  dive: 0.9,
  /** Radians of reveal-turn across the act (`galaxy.tsx`), not an edge-on tilt. */
  diveTilt: 4.2,
  parallax: 0.55,
  pointerRadius: 1.1,
  pointerStrength: 0.4,
} as const;

/**
 * Brain point cloud — the third form, in place of the returning orb + logo.
 *
 * Geometry is area-sampled from a GLB (see `scene/brain/`). Colours are the
 * source scene's, recoloured to the orb's (first scene's) form gradient: the
 * cool→warm vertical tint runs indigo (`ORB_CONFIG.colorBottom`) → mint
 * (`colorTop`), with the same indigo edge, so the brain reads as the same soft
 * gradient as the hero orb. The scalar flow/synapse/size values are the source's.
 */
export const BRAIN_CONFIG = {
  /** Vertical tint: bottom (cool) → top (warm) — the orb's indigo→mint. */
  colorCool: "#a02a00",
  colorWarm: "#fafafa",
  /** Bright silhouette edge — the orb's edge. */
  colorEdge: "#c53400",
  /** Dark interior the edge fades toward. */
  colorCenter: "#000000",
  /** White-hot synapse flash. */
  colorSynapse: "#fff1e8",
  /** Occluded/deep fade colour. */
  colorDeep: "#0d0604",
  /** Cursor "neuron" highlight. */
  colorCursor: "#ff8a4a",
  centerRadius: 0.16,
  centerFalloff: 4,
  size: 0.067,
  synapseRate: 0.1,
  flowSpeed: 2.3,
  flowAmount: 0.025,
  glow: 1.4,
  depthDarkness: 1,
  /** Bounding radius the sampled cloud is scaled to — sized to the hero camera. */
  radius: 0.85,
  /** Points sampled across the surface (desktop; scaled per tier in adaptive). */
  count: 140000,
  /** Radians the brain swivels toward the cursor. */
  cursorTilt: 0.22,
  /** How far scrolling past the assembled brain turns it, in radians. */
  scrollSpin: 0.8,
  /**
   * Resting rotation about the vertical axis, tuned so the formed brain reads as
   * a lateral (side) profile as it comes in. (The source's own "-90° profile" was
   * front-on for this GLB; this turns it a further ~90°.) Flip the sign of the
   * added term (± ~1.57) to show the other profile.
   */
  baseRotationY: -1.309 - 1.5708,
  /** World units the brain rushes toward the camera as it bursts on exit. */
  approach: 2.5,
} as const;

/** Pointer sway of the orb camera. Far smaller — the orb sits close. */
export const ORB_PARALLAX = 0.35;

/** How far the intro pulls the camera back before dollying in. */
export const INTRO_DOLLY = 10;
