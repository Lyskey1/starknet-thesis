/* Display-name sanitizer for the ecosystem directory (2026-09-23).
   X allows anything in a display name. The hero chip and the prerendered
   list render one line of it, so:
     1. strip emoji and other pictographic characters, emoji modifiers and
        flag halves, variation selectors, zero-width joiners and the other
        zero-width characters, keycap and tag characters;
     2. collapse whitespace;
     3. trim separator characters left dangling at either end (| · - and
        the like) that only ever framed an emoji.
   Letters and digits in every script pass through untouched, and so does
   the em-dash anywhere in the name, including at the edges, because it is
   punctuation people type on purpose. Note that Extended_Pictographic also
   covers © ® and ™, which are therefore stripped.
   Returns { name, altered, emDash }: name is '' when nothing legible is
   left, in which case the caller falls back to the handle. */

const STRIP = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0E}\u{FE0F}\u{200B}-\u{200D}\u{2060}\u{FEFF}\u{20E3}\u{E0020}-\u{E007F}]/gu;
/* separators trimmed from the edges: pipes, bullets, geometric marks, the
   dashes that are NOT the em-dash, and glue punctuation */
const EDGE_CLASS = '[\\s|¦·•∙◦●○◆◇■□▪▫★☆✦✧✶»«›‹~:;/\\\\_\\-\\u2010-\\u2013\\u2015\\u2212=+*^&]';
const EDGE = new RegExp('^(?:' + EDGE_CLASS + ')+|(?:' + EDGE_CLASS + ')+$', 'gu');
export const EM_DASH = '—';
export const MAX_LEN = 160;

export function sanitizeDisplayName(raw) {
  const input = String(raw == null ? '' : raw);
  let name = input
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(STRIP, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(EDGE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN);
  return { name, altered: name !== input.trim(), emDash: name.includes(EM_DASH) };
}
