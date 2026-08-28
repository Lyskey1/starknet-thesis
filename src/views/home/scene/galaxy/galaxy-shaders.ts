/**
 * Second-act shaders: a dense point-cloud bust (Privacy).
 *
 * This file used to compute a spiral-galaxy target position (two arms plus a
 * 3D core bulge). The scene's second act is now Privacy, staged as a
 * head-and-shoulders bust assembling out of dust: same file, same component,
 * same clock signals, only the per-point target-position formula changed,
 * from a spiral to a bust.
 *
 * The geometry is still only a seed lattice (see `galaxy.tsx`): every point's
 * position is thrown away and replaced by a hash of it. Three parts, head,
 * neck, shoulders, each claim a share of the points proportional to their
 * volume, chosen by comparing one hash against a cumulative threshold table.
 * Each part is a filled ellipsoid, not a shell: `ellipsoidPoint` samples deep
 * into the interior (not just its surface), so the bust reads as a dense,
 * volumetric mass of dust rather than a hollow outline, brightest where
 * points land close together near the core.
 *
 * Everything downstream of the target position (the inbound spawn-and-delay,
 * the outbound dispersal, the world scale, the cursor repel, the point size)
 * is the same code as the spiral used, with the raw distances re-tuned for a
 * ~1-unit-tall bust instead of a ~90-unit galaxy.
 */
export const galaxyVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uArmSpin;
  uniform float uScale;
  uniform float uBlow;
  uniform float uAssemble;
  uniform vec3  uColEdge;
  uniform vec3  uColCore;
  uniform vec3  uCursor;
  uniform float uRepelRadius;
  uniform float uRepelStrength;
  uniform float uActivity;

  varying float vFade;
  varying vec3  vColor;

  // A point in the interior of an ellipsoid, from three hashes in [0,1).
  // Depth ranges from near the core (0.15) to the surface (1.0), so the fill
  // is volumetric rather than a hollow shell.
  vec3 ellipsoidPoint(vec3 center, vec3 radii, float ra, float rb, float rc) {
    float theta = ra * 6.2831853;
    float phi = acos(rb * 2.0 - 1.0);
    vec3 dir = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
    float depth = 0.15 + rc * 0.85;
    return center + dir * radii * depth;
  }

  // Which of the three parts this point belongs to, and its position on it.
  // Weighted by each part's actual volume, so density (points per unit
  // volume) is uniform across the bust instead of the head over-saturating.
  vec3 humanPoint(float pick, float ra, float rb, float rc) {
    if (pick < 0.18) {
      return ellipsoidPoint(vec3(0.0, 0.62, 0.0), vec3(0.17, 0.20, 0.18), ra, rb, rc);
    } else if (pick < 0.195) {
      return ellipsoidPoint(vec3(0.0, 0.40, 0.0), vec3(0.075, 0.09, 0.07), ra, rb, rc);
    } else {
      return ellipsoidPoint(vec3(0.0, 0.02, 0.0), vec3(0.36, 0.34, 0.22), ra, rb, rc);
    }
  }

  void main() {
    float gRnd1 = fract(sin(dot(position.xyz, vec3(12.989, 78.233, 45.164))) * 43758.545);
    float gRnd2 = fract(sin(dot(position.xyz, vec3(93.989, 67.345, 54.256))) * 24634.634);
    float gRnd3 = fract(sin(dot(position.xyz, vec3(43.332, 11.235, 89.234))) * 56475.234);
    float gRnd4 = fract(sin(dot(position.xyz, vec3(75.321, 32.123, 23.456))) * 35432.123);

    // A slow breathing pulse: the only thing time moves once the figure is
    // formed; everything else about its pose is fixed per point.
    float breathe = sin(uTime * 0.55 + gRnd4 * 6.2831853) * 0.006;
    vec3 galaxyPos = humanPoint(gRnd1, gRnd2, gRnd3, gRnd4) * (1.0 + breathe);

    vec3 blowDir = normalize(vec3(gRnd1, gRnd2, gRnd3) - 0.5 + 0.0001);

    // Assembly: each point streams in from a surrounding cloud, on its own
    // delay, so the figure gathers out of drifting dust instead of fading on.
    // Re-tuned for a ~1-unit bust: the spiral spawned 70 units out because its
    // own points spanned up to 90; this bust's do not.
    float delay = gRnd4 * 0.45;
    float at = clamp((1.0 - uAssemble - delay) / (1.0 - delay), 0.0, 1.0);
    float aEase = 1.0 - pow(1.0 - at, 3.0);
    vec3 spawn = galaxyPos + blowDir * 1.9 + vec3(0.0, (gRnd3 - 0.5) * 0.85, 0.0);
    galaxyPos = mix(spawn, galaxyPos, aEase);

    // Dispersal: every point flies out along its own direction as the act ends.
    galaxyPos += blowDir * uBlow * 2.7;

    vec3 finalPos = galaxyPos * uScale;
    vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);

    vec3 toP = modelPosition.xyz - uCursor;
    float cd = length(toP);
    float fall = smoothstep(uRepelRadius, 0.0, cd);
    modelPosition.xyz += normalize(toP + vec3(0.0001)) * fall * uRepelStrength * uActivity;
    vec4 mvPosition = viewMatrix * modelPosition;

    // Vertical gradient, matching the orb and the coin: light at the crown,
    // warm toward the ground: one colour language across all three acts.
    float heightMix = smoothstep(-0.35, 0.82, galaxyPos.y);
    vColor = mix(uColCore, uColEdge, heightMix);

    float isOrb = step(0.98, fract(gRnd1 * 77.77));
    float starSize = mix(1.0, 3.0, isOrb);
    vFade = mix(0.7, 1.0, isOrb);

    gl_PointSize = uSize * starSize * (10.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 1.5);
    gl_Position = projectionMatrix * mvPosition;
  }`;

export const galaxyFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uAppear;
  uniform float uFade;

  varying float vFade;
  varying vec3  vColor;

  void main() {
    vec2 xy = gl_PointCoord - 0.5;
    float ll = length(xy);
    if (ll > 0.5) discard;
    float a = smoothstep(0.5, 0.1, ll);
    gl_FragColor = vec4(vColor * uBrightness, vFade * a * uOpacity * uAppear * uFade);
  }`;
