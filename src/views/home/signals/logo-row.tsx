"use client";

import { useState } from "react";

/**
 * Six project logos from the ecosystem data, through the ecosystem page's
 * own avatar pipeline as far as a build can carry it: the account's avatar
 * field, else the local mirror, else the initials monogram once the image
 * fails to load.
 */
export interface LogoItem {
  name: string;
  handle: string;
  url: string;
  src: string;
  monogram: string;
}

const Logo = ({ item }: { item: LogoItem }) => {
  const [failed, setFailed] = useState(false);
  return (
    <a className="lp-logo" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.name} title={item.name}>
      {failed ? (
        <span aria-hidden="true">{item.monogram}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.src} alt="" width={44} height={44} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </a>
  );
};

export const LogoRow = ({ items }: { items: LogoItem[] }) => (
  <div className="lp-logos">
    {items.map((item) => <Logo key={item.handle} item={item} />)}
  </div>
);
