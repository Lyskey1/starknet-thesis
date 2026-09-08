import { HomeView } from "@/views/home";

/** The landing regenerates hourly so the digest counts follow the Substack feed (src/lib/data/digest.ts). */
export const revalidate = 3600;

export default function Home() {
  return <HomeView />;
}
