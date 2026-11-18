#!/usr/bin/env node
// Print a real, signed `x-siws-auth` header for a well-known Substrate dev
// account (default //Alice), for curling a LOCAL server.
//
// Replaces the removed `x-siws-auth: dev-bypass` shortcut (#313): requests are
// authenticated by a genuine signature through the normal SIWS pipeline, so
// the account still has to be an admin on the server you call (e.g. put
// Alice's address in your local ADMIN_WALLETS). The dev mnemonics are public —
// never add these addresses to a production admin list.
//
// Each header carries a fresh single-use nonce, so generate one per request.
//
// Usage:
//   node scripts/sign-dev-siws.js [--uri //Alice] [--domain localhost]
//     [--statement "Perform administrative action on Stadium"] [--ttl 300]
//
//   curl -H "x-siws-auth: $(node scripts/sign-dev-siws.js)" \
//     http://localhost:2000/api/admin/me/tier

import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { stringToU8a, u8aToHex } from '@polkadot/util';
import { SiwsMessage } from '@talismn/siws';
import { randomBytes } from 'node:crypto';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const uri = arg('uri', '//Alice');
const domain = arg('domain', process.env.EXPECTED_DOMAIN || 'localhost');
const statement = arg('statement', 'Perform administrative action on Stadium');
const ttlSeconds = Number(arg('ttl', '300'));

if (!/^\/\/[A-Za-z]+$/.test(uri)) {
  console.error('Only well-known dev derivations like //Alice are supported.');
  process.exit(2);
}

await cryptoWaitReady();
const pair = new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromUri(uri);

const now = Date.now();
const siws = new SiwsMessage({
  domain,
  uri: `http://${domain}`,
  address: pair.address,
  nonce: randomBytes(12).toString('hex'),
  statement,
  chainName: 'Substrate',
  issuedAt: now,
  expirationTime: now + ttlSeconds * 1000,
});

const message = siws.prepareMessage();
const signature = u8aToHex(pair.sign(stringToU8a(message)));
const header = Buffer.from(
  JSON.stringify({ message, signature, address: pair.address }),
).toString('base64');

process.stdout.write(header);
if (process.stdout.isTTY) process.stdout.write('\n');
