/**
 * The selector engine the landing shares with the static pages
 * (public/js/selector-rove.js + public/js/selector-panel.js) attaches to
 * window; the particle engine (public/js/hero-mark-engine.js) is typed by
 * its sibling .d.ts.
 */
interface Window {
  thRove?: unknown;
  thMorph?: unknown;
  initQw?: (
    root: HTMLElement,
    onPick?: (i: number) => void,
  ) => { select(i: number, instant?: boolean): void; shown(): number } | null;
}
