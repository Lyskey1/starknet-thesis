import type { NextConfig } from "next";

const STATIC_PAGES = ["privacy", "quantum", "btcfi", "strk", "ecosystem", "digest"];

const nextConfig: NextConfig = {
  // Drop the `X-Powered-By: Next.js` response header.
  poweredByHeader: false,

  // The six thesis pages are static HTML served from public/. Clean URLs map
  // onto them; the .html forms redirect so old links keep working.
  async rewrites() {
    return STATIC_PAGES.map((page) => ({ source: `/${page}`, destination: `/${page}.html` }));
  },
  async redirects() {
    return STATIC_PAGES.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true }));
  },

  compiler: {
    // Strip `console.*` from production bundles, keeping error/warn for
    // monitoring. Left on in dev so logs stay available.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  images: {
    // Modern formats — smaller than JPEG/PNG; the browser picks what it supports.
    formats: ["image/avif", "image/webp"],
    // Breakpoints `next/image` uses to build `srcset`. `deviceSizes` covers
    // full-width images (aligned with the adaptive-grid breakpoints + retina);
    // `imageSizes` covers smaller, fixed-width images and icons.
    deviceSizes: [360, 640, 768, 1024, 1280, 1440, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // React Compiler (automatic memoisation) is an opt-in performance win.
  // It requires the `babel-plugin-react-compiler` dev dependency and routes
  // the build through Babel — enable once installed:
  // reactCompiler: true,
};

export default nextConfig;
