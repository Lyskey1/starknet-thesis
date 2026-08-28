/**
 * Second-act shaders — a standing point-cloud humanoid (Privacy).
 *
 * This file used to compute a spiral-galaxy target position (two arms plus a
 * 3D core bulge). The scene's second act is now Privacy, staged as a figure
 * assembling out of dust: same file, same component, same clock signals — only
 * the per-point target-position formula changed, from a spiral to a body.
 *
 * The geometry is still only a seed lattice (see `galaxy.tsx`): every point's
 * position is thrown away and replaced by a hash of it. Twelve body parts —
 * head, neck, torso, pelvis, two arms, two hands, two legs, two feet — each
 * claim a share of the points proportional to their surface, chosen by
 * comparing one hash against a cumulative threshold table. Ellipsoid parts
 * (head, torso, …) sample a point near their surface from two more hashes;
 * capsule parts (arms, legs) sample along their axis and around it.
 *
 * Everything downstream of the target position — the inbound spawn-and-delay,
 * the outbound dispersal, the world scale, the cursor repel, the point size —
 * is the same code as the spiral used, with the raw distances re-tuned for a
 * ~2-unit-tall figure instead of a ~90-unit galaxy.
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

  // A point near the surface of an ellipsoid, from three hashes in [0,1).
  vec3 ellipsoidPoint(vec3 center, vec3 radii, float ra, float rb, float rc) {
    float theta = ra * 6.2831853;
    float phi = acos(rb * 2.0 - 1.0);
    vec3 dir = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
    float depth = 0.82 + rc * 0.18; // mostly on the surface, a little fill
    return center + dir * radii * depth;
  }

  // A point near the surface of a capsule from a to b, from three hashes.
  vec3 capsulePoint(vec3 a, vec3 b, float radius, float rt, float ra, float rb) {
    vec3 axis = b - a;
    float len = length(axis);
    vec3 dir = axis / max(len, 1e-5);
    vec3 up = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 perp1 = normalize(cross(dir, up));
    vec3 perp2 = cross(dir, perp1);
    vec3 core = a + dir * (rt * len);
    float ang = ra * 6.2831853;
    float rad = radius * (0.82 + rb * 0.18);
    return core + (perp1 * cos(ang) + perp2 * sin(ang)) * rad;
  }

  // Which of the twelve parts this point belongs to, and its position on it.
  // Weighted by each part's approximate surface — the torso and legs are the
  // biggest masses, so they claim the most points; hands and feet the fewest.
  vec3 humanPoint(float pick, float ra, float rb, float rc) {
    if (pick < 0.06) {
      return ellipsoidPoint(vec3(0.0, 0.74, 0.0), vec3(0.11, 0.13, 0.12), ra, rb, rc);
    } else if (pick < 0.08) {
      return ellipsoidPoint(vec3(0.0, 0.565, 0.0), vec3(0.045, 0.06, 0.045), ra, rb, rc);
    } else if (pick < 0.32) {
      return ellipsoidPoint(vec3(0.0, 0.26, 0.0), vec3(0.165, 0.30, 0.115), ra, rb, rc);
    } else if (pick < 0.41) {
      return ellipsoidPoint(vec3(0.0, -0.10, 0.0), vec3(0.12, 0.12, 0.095), ra, rb, rc);
    } else if (pick < 0.49) {
      return capsulePoint(vec3(-0.30, 0.50, 0.0), vec3(-0.44, -0.04, 0.05), 0.05, ra, rb, rc);
    } else if (pick < 0.57) {
      return capsulePoint(vec3(0.30, 0.50, 0.0), vec3(0.44, -0.04, 0.05), 0.05, ra, rb, rc);
    } else if (pick < 0.59) {
      return ellipsoidPoint(vec3(-0.46, -0.13, 0.055), vec3(0.045, 0.06, 0.035), ra, rb, rc);
    } else if (pick < 0.61) {
      return ellipsoidPoint(vec3(0.46, -0.13, 0.055), vec3(0.045, 0.06, 0.035), ra, rb, rc);
    } else if (pick < 0.77) {
      return capsulePoint(vec3(-0.135, -0.20, 0.0), vec3(-0.15, -0.95, 0.02), 0.075, ra, rb, rc);
    } else if (pick < 0.93) {
      return capsulePoint(vec3(0.135, -0.20, 0.0), vec3(0.15, -0.95, 0.02), 0.075, ra, rb, rc);
    } else if (pick < 0.965) {
      return ellipsoidPoint(vec3(-0.15, -1.0, 0.09), vec3(0.055, 0.04, 0.12), ra, rb, rc);
    } else {
      return ellipsoidPoint(vec3(0.15, -1.0, 0.09), vec3(0.055, 0.04, 0.12), ra, rb, rc);
    }
  }

  void main() {
    float gRnd1 = fract(sin(dot(position.xyz, vec3(12.989, 78.233, 45.164))) * 43758.545);
    float gRnd2 = fract(sin(dot(position.xyz, vec3(93.989, 67.345, 54.256))) * 24634.634);
    float gRnd3 = fract(sin(dot(position.xyz, vec3(43.332, 11.235, 89.234))) * 56475.234);
    float gRnd4 = fract(sin(dot(position.xyz, vec3(75.321, 32.123, 23.456))) * 35432.123);

    // A slow breathing pulse — the only thing time moves once the figure is
    // formed; everything else about its pose is fixed per point.
    float breathe = sin(uTime * 0.55 + gRnd4 * 6.2831853) * 0.006;
    vec3 galaxyPos = humanPoint(gRnd1, gRnd2, gRnd3, gRnd4) * (1.0 + breathe);

    vec3 blowDir = normalize(vec3(gRnd1, gRnd2, gRnd3) - 0.5 + 0.0001);

    // Assembly — each point streams in from a surrounding cloud, on its own
    // delay, so the figure gathers out of drifting dust instead of fading on.
    // Re-tuned for a ~2-unit body: the spiral spawned 70 units out because its
    // own points spanned up to 90; this figure's do not.
    float delay = gRnd4 * 0.45;
    float at = clamp((1.0 - uAssemble - delay) / (1.0 - delay), 0.0, 1.0);
    float aEase = 1.0 - pow(1.0 - at, 3.0);
    vec3 spawn = galaxyPos + blowDir * 3.2 + vec3(0.0, (gRnd3 - 0.5) * 1.4, 0.0);
    galaxyPos = mix(spawn, galaxyPos, aEase);

    // Dispersal — every point flies out along its own direction as the act ends.
    galaxyPos += blowDir * uBlow * 4.6;

    vec3 finalPos = galaxyPos * uScale;
    vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);

    vec3 toP = modelPosition.xyz - uCursor;
    float cd = length(toP);
    float fall = smoothstep(uRepelRadius, 0.0, cd);
    modelPosition.xyz += normalize(toP + vec3(0.0001)) * fall * uRepelStrength * uActivity;
    vec4 mvPosition = viewMatrix * modelPosition;

    // Vertical gradient, matching the orb and the coin: light at the crown,
    // warm toward the ground — one colour language across all three acts.
    float heightMix = smoothstep(-1.05, 0.85, galaxyPos.y);
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
