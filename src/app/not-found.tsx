import type { Metadata } from "next";

import NotFoundScreen from "./not-found-screen";

/**
 * Server wrapper for the 404 screen.
 *
 * The screen itself is a client component, and a client component cannot
 * export `metadata`. That had two consequences, both fixed here:
 *
 *   1. The root layout's `generateMetadata()` sets `robots: "index, follow"`,
 *      which applied to the not-found boundary too, so the 404 shipped TWO
 *      contradictory robots tags. Google honours the most restrictive, so
 *      noindex won, but the ambiguity was avoidable.
 *   2. The title was only set in a `useEffect`, so the server-rendered title
 *      was the homepage's, which is what a non-rendering crawler saw.
 *
 * Splitting the file lets the metadata be declared on the server where it
 * belongs. The screen is unchanged apart from dropping its title effect.
 */
export const metadata: Metadata = {
  title: "404, page not found",
  description: "That page does not exist on Starknet Thesis.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundScreen />;
}
