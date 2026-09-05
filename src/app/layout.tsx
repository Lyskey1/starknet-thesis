import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Mulish, Onest } from "next/font/google";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { AdaptiveGrid } from "@/components/common/grid";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { SiteHeader } from "@/components/common/site-header";
import { ScrollLayout } from "@/layouts/scroll-layout";

import "@/app/globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

/** Hero display + chrome face, per the Figma. Self-hosted from Fontshare. */
const generalSans = localFont({
  variable: "--font-general-sans",
  display: "swap",
  src: [
    { path: "./fonts/GeneralSans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
  ],
});

/** Nav wordmark face (2026-09-05 nav typography pass): Archivo with the
 * width axis, so the header can set it Expanded 500 like the static pages,
 * which load the same axis range from Google Fonts. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

/** Nav link + Subscribe face: the mono uppercase eyebrow grammar the static
 * pages already run (IBM Plex Mono). */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** Hero eyebrow / tag + stat face, per the Figma. */
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${onest.variable} ${generalSans.variable} ${mulish.variable} ${archivo.variable} ${plexMono.variable}`}
      >
        <script defer src="https://cloud.umami.is/script.js" data-website-id="45f11859-9fc2-49ae-a59e-4826e0f1e174" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          <AdaptiveGrid />
          <ReducedMotion />
          {/* Fixed site-wide chrome — sits above every section. */}
          <SiteHeader />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}
