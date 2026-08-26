import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node tooling and the static thesis pages are not part of the Next app.
    "tools/**",
    "scripts/**",
    "api/**",
    "public/**",
    "reference/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-empty-function": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // The WebGL scene sits outside React's render model on purpose: r3f's
    // `useFrame` mutates meshes, uniforms, and the camera every frame, and the
    // geometry builders seed themselves with `Math.random()`. Both are the
    // documented r3f idiom, and neither is something the React Compiler can
    // reason about. Scoped to the scene so the rest of the app keeps the checks.
    // ADR: obsidian/meta/decisions-log.md ADR-0015.
    files: ["src/views/home/scene/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
