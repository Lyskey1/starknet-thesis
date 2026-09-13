/* Types for hero-mark-engine.js, for the Next bundle's benefit (the static
   pages load the .js through their importmap and never see this file). */
import type * as THREE from "three";

export { THREE };
export const PALETTE: { acc: string; warm: string; chalk: string };
export const FRAG: string;
export function rnd(i: number, s: number): number;
export function vertexShader(opts?: { attributes?: string; uniforms?: string; move?: string }): string;

export type Fill = (
  i: number,
  pos: Float32Array,
  siz: Float32Array,
  pha: Float32Array,
  alp: Float32Array,
  tin: Float32Array,
  x: Record<string, Float32Array>,
) => void;

export interface FitArgs {
  camera: THREE.PerspectiveCamera;
  aspect: number;
  small: boolean;
  HALF_FOV: number;
  w: number;
  h: number;
}

export interface HeroMark {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: THREE.Group;
  mats: THREE.ShaderMaterial[];
  HALF_FOV: number;
  reduced: boolean;
  smallMQ: MediaQueryList;
  makeMaterial(vert: string, extraUniforms: Record<string, unknown>, drift: number, span: number): THREE.ShaderMaterial;
  points(N: number, fill: Fill, mat: THREE.ShaderMaterial, extraAttrs?: string[], boundingRadius?: number): THREE.Points;
  run(hooks: {
    fit?: (a: FitArgs) => number;
    target?: (small: boolean) => number;
    draw?: (world: THREE.Group, t: number) => void;
  }): void;
  fit(): void;
  draw(t: number): void;
  dispose(): void;
}

export function createMark(opts: {
  mount: HTMLElement;
  host?: HTMLElement | null;
  tag?: string;
  speed?: number;
  fov?: number;
  far?: number;
}): HeroMark | null;
