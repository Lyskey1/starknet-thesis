/* node --test scripts/lib/  */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDisplayName } from './display-name.mjs';

const cases = [
  ['name ending in one emoji',              'Starknet 🚀',                 'Starknet',              true,  false],
  ['emoji between two words',               'Ekubo 🐙 Protocol',           'Ekubo Protocol',        true,  false],
  ['ending in " | " plus an emoji',         'Paradex | 🔥',                'Paradex',               true,  false],
  ['only emoji falls back (empty)',         '🔥🔥🔥',                       '',                      true,  false],
  ['ZWJ family sequence',                   '👨‍👩‍👧 Realms',                 'Realms',                true,  false],
  ['flag (regional indicators)',            '🇺🇸 Nums',                     'Nums',                  true,  false],
  ['variation selector + keycap',           '1️⃣ Loot Survivor ✌️',          '1 Loot Survivor',       true,  false],
  ['Japanese passes unchanged',             'スターク ネット',               'スターク ネット',        false, false],
  ['Arabic passes unchanged',               'شبكة ستارك',                   'شبكة ستارك',            false, false],
  ['em-dash passes unchanged and is flagged','Realms — Eternum',            'Realms — Eternum',      false, true],
  ['em-dash at the edge is kept',           'Eternum —',                   'Eternum —',             false, true],
  ['en-dash at the edge is trimmed',        'Eternum – 🎮',                'Eternum',               true,  false],
  ['bullets and pipes both ends',           '• Vesu | 🌊 |',               'Vesu',                  true,  false],
  ['plain name untouched',                  'Avnu',                        'Avnu',                  false, false],
  ['inner punctuation kept',                'Loot Survivor: Season 2!',    'Loot Survivor: Season 2!', false, false],
  ['whitespace collapsed',                  '  Braavos   Wallet ',         'Braavos Wallet',        true,  false],
];
for (const [label, input, expected, altered, emDash] of cases) {
  test(label, () => {
    const r = sanitizeDisplayName(input);
    assert.equal(r.name, expected);
    assert.equal(r.altered, altered, 'altered flag');
    assert.equal(r.emDash, emDash, 'emDash flag');
  });
}
