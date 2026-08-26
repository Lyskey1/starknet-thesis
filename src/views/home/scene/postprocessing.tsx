"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import * as THREE from "three";

/**
 * Bloom over the additive particle forms.
 *
 * The threshold is in **linear** light, not sRGB. Scene colours are uploaded
 * linear (see `scene/color.ts`), so a low threshold catches the background wash
 * and smears the whole frame; only the genuinely hot cores should bloom.
 *
 * The source scenes stacked two `UnrealBloomPass`es (0.22/0.2 and 0.6/0.6) and
 * composited them additively; this is the single-pass equivalent.
 */
export const Postprocessing = () => {
  return (
    // `enabled={false}` would still build the composer, so callers omit this
    // component entirely on the weakest tier.
    // 8-bit framebuffers on purpose. The default is RGBA16F, and on Chrome 151's
    // ANGLE/Metal backend (Apple silicon) the half-float bloom chain resolves to
    // a black final composite: every draw lands in the mip RTs and the screen
    // gets nothing (verified 2026-08-26 by sampling the default framebuffer).
    // SwiftShader hides it, real GPUs do not. The visible cost is a little
    // banding in the bloom falloff, which the film-grain-free dark ground hides.
    <EffectComposer renderPriority={2} frameBufferType={THREE.UnsignedByteType}>
      <Bloom
        intensity={0.6}
        kernelSize={KernelSize.MEDIUM}
        // Raised so only genuinely hot cores bloom — a lower threshold let the
        // whole bright orb glow, smearing it into a soft wash ("soapy").
        luminanceThreshold={0.6}
        luminanceSmoothing={0.22}
        // `mipmapBlur` defaults to a near-full-screen radius, which smears the
        // galaxy's hot core across the whole frame and washes the background.
        // Tightened alongside the threshold to keep the glow close to the source.
        radius={0.3}
        mipmapBlur
      />
    </EffectComposer>
  );
};
