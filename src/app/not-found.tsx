"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * BIOS boot-screen 404 in the strk20 palette: orange ground, dark bars,
 * IBM Plex Mono. Lines boot in one by one; any key returns home (see the
 * inline script). Kept as a plain document on purpose, no springs: it is a
 * terminal, not part of the scroll stage.
 */
const LINES: { text: React.ReactNode; delay: number; cls?: string }[] = [
  { text: <>BIOS Date: <span id="nf-date">--/--/----  --:--:--</span>  Ver: 4.0.4</>, delay: 0.05 },
  { text: "Starknet Thesis Web Core(tm) STRK @ 3 Forces", delay: 0.15, cls: "hi" },
  { text: "Speed: 1 chain, 1 ticker", delay: 0.25 },
  { text: "", delay: 0 },
  { text: "Press DEL to run Setup,  F11 for Boot Menu", delay: 0.5, cls: "lit" },
  { text: "Initializing privacy pool ..  Done.", delay: 0.65, cls: "lit" },
  { text: "65536 notes OK", delay: 0.8, cls: "hi" },
  { text: "", delay: 0 },
  { text: "Auto-Detecting requested page ...", delay: 1.1 },
  { text: <>   Route  : <span id="nf-path" className="hi">/</span></>, delay: 1.3 },
  { text: <>   Status : <span className="hi">404 None</span></>, delay: 1.45 },
  { text: <>   Privacy   : <a href="/privacy">Ready</a></>, delay: 1.6 },
  { text: <>   Quantum   : <a href="/quantum">Ready</a></>, delay: 1.7 },
  { text: <>   BTCFi     : <a href="/btcfi">Ready</a></>, delay: 1.8 },
  { text: <>   STRK      : <a href="/strk">Ready</a></>, delay: 1.9 },
  { text: "", delay: 0 },
  { text: "Reboot and Select proper Boot device", delay: 2.2 },
  { text: <>or return to <Link href="/">the thesis</Link> and press a key</>, delay: 2.3 },
];

const CSS = `
.nf{--galaxy:#c53400;--field:#0d0d0d;--flare:#fafafa;--moon:#ffd6c2;--lilac:rgba(250,250,250,.72);
  position:fixed;inset:0;z-index:100;background:var(--galaxy);color:var(--flare);
  font:500 16px/1.45 "IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;flex-direction:column;overflow:auto}
.nf::after{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(13,13,13,.18) 0 1px,transparent 1px 3px)}
.nf .bar{background:var(--field);color:var(--flare);padding:6px 20px;display:flex;justify-content:space-between;gap:24px;font-weight:600}
.nf main{flex:1;padding:40px 50px}
.nf pre{margin:0;font:inherit;white-space:pre-wrap}
.nf .lit{color:var(--moon)}.nf .hi{color:var(--flare);font-weight:600}
.nf a{color:inherit;text-decoration:underline;text-underline-offset:3px}.nf main a:hover{color:var(--moon)}
.nf .cursor::after{content:"\\2588";margin-left:4px;animation:nf-blink 1s steps(1) infinite}
@keyframes nf-blink{50%{opacity:0}}
.nf .line{opacity:0;animation:nf-show .01s linear forwards}
@keyframes nf-show{to{opacity:1}}
@media (prefers-reduced-motion:reduce){.nf .line{animation-delay:0s!important}}
@media (max-width:720px){.nf main{padding:24px 16px}.nf{font-size:13px}.nf .bar{padding:6px 12px;font-size:12px}}
`;

const pad = (n: number) => (n < 10 ? "0" : "") + n;

export default function NotFound() {
  useEffect(() => {
    const d = new Date();
    const date = document.getElementById("nf-date");
    if (date) date.textContent = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const route = document.getElementById("nf-path");
    if (route) route.textContent = location.pathname.slice(0, 60) || "/";
    document.title = "404 · Starknet Thesis";
    const onKey = () => { location.href = "/"; };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="nf">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- the BIOS face is only used here */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="bar"><span>STARKNET THESIS BIOS (C) 2026 Lyskey Research</span><span>v4.0.4</span></div>
      <main>
        <pre>
          {LINES.map((line, i) =>
            line.text === "" ? (
              "\n"
            ) : (
              <span key={i}>
                <span className={`line ${line.cls ?? ""}`} style={{ animationDelay: `${line.delay}s` }}>{line.text}</span>
                {"\n"}
              </span>
            ),
          )}
        </pre>
      </main>
      <div className="bar">
        <span className="cursor"><Link href="/" style={{ textDecoration: "none" }}>Press any key to reboot</Link></span>
        <span>F1: <a href="/digest" style={{ textDecoration: "none" }}>Digest</a>&nbsp;&nbsp;&nbsp;&nbsp;ESC: <a href="/ecosystem" style={{ textDecoration: "none" }}>Ecosystem</a></span>
      </div>
    </div>
  );
}
