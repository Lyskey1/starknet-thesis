/**
 * Home view — VESPER / V—0RB.
 *
 * A Server Component: it owns the copy and hands it to the client stage, which
 * is where the WebGL canvas, the scroll clock, and the HUD all live.
 */
import { homeFaq, homeFooter, homeLoader } from "@/data/home";
import { ScrollStage } from "./home/scroll-stage";

export const HomeView = () => {
  return (
    <ScrollStage loader={homeLoader} faq={homeFaq} footer={homeFooter} />
  );
};
