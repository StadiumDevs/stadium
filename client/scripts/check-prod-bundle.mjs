#!/usr/bin/env node
// Fail if a production build ships the test-wallet harness or any well-known
// Substrate dev account (#302). Run after `npm run build`:
//
//   node scripts/check-prod-bundle.mjs [distDir]
//
// The //Alice … //Ferdie keys are public. The test-wallet harness
// (src/lib/testWalletInjection.ts) is gated on `import.meta.env.PROD !== true`
// and the TEST PAYMENT modal on `import.meta.env.DEV`, so both must be
// tree-shaken out of a production build. This script proves it.
//
// Same dev-account list as the server-side guard added in #301
// (server/api/auth/authConfigSafety.js); dedupe once both are merged.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DIST = resolve(process.argv[2] || 'dist');

const DEV_ACCOUNTS = [
  ['//Alice sr25519', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
  ['//Bob sr25519', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
  ['//Charlie sr25519', '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'],
  ['//Dave sr25519', '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'],
  ['//Eve sr25519', '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw'],
  ['//Ferdie sr25519', '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'],
  ['//Alice//stash sr25519', '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY'],
  ['//Bob//stash sr25519', '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc'],
  ['//Charlie//stash sr25519', '5Ck5SLSHYac6WFt5UZRSsdJjwmpSZq85fd5TRNAdZQVzEAPT'],
  ['//Dave//stash sr25519', '5HKPmK9GYtE1PSLsS1qiYU9xQ9Si1NcEhdeCq9sw5bqu4ns8'],
  ['//Eve//stash sr25519', '5FCfAonRZgTFrTd9HREEyeJjDpT397KMzizE6T3DvebLFE7n'],
  ['//Ferdie//stash sr25519', '5CRmqmsiNFExV6VbdmPJViVxrWmkaXXvBrSX8oqBT8R9vmWk'],
  ['//Alice ed25519', '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu'],
  ['//Bob ed25519', '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E'],
  ['//Charlie ed25519', '5DbKjhNLpqX3zqZdNBc9BGb4fHU1cRBaDhJUskrvkwfraDi6'],
  ['//Dave ed25519', '5ECTwv6cZ5nJQPk6tWfaTrEk8YH2L7X1VT4EL5Tx2ikfFwb7'],
  ['//Eve ed25519', '5Ck2miBfCe1JQ4cY3NDsXyBaD6EcsgiVmEFTWwqNSs25XDEq'],
  ['//Ferdie ed25519', '5E2BmpVFzYGd386XRCZ76cDePMB3sfbZp5ZKGUsrG1m6gomN'],
  ['//Alice ecdsa', '5C7C2Z5sWbytvHpuLTvzKunnnRwQxft1jiqrLD5rhucQ5S9X'],
  ['//Bob ecdsa', '5DVskgSC9ncWQpxFMeUn45NU43RUq93ByEge6ApbnLk6BR9N'],
  ['//Charlie ecdsa', '5EP2cMaCxLzhfD3aFAqqgu3kfXH7GcwweEv6JXZRP6ysRHkQ'],
  ['//Dave ecdsa', '5CtLD1M83vbXs42XPYyvygkUg6BxxMRBAiNqg1XD5qe7iW8g'],
  ['//Eve ecdsa', '5GCnMRtSQq8i2fShXieQThcRyLakPyVPcTLm65Bcii4NAp5n'],
  ['//Ferdie ecdsa', '5HkJ124K2dtXW3EFE8oUw9bkgiJMrSh4E9gNiiSCU2TpEjTS'],
  // //Alice sr25519 public key, in case it is inlined as hex.
  ['//Alice sr25519 pubkey', 'd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'],
];

const HARNESS_MARKERS = [
  // The public Substrate dev seed phrase.
  ['dev seed phrase', 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'],
  ['test-wallet flag', '__TEST_WALLET_ENABLED__'],
  ['test-wallet extension version', '0.0.0-test-wallet'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
try {
  files = walk(DIST).filter((f) => /\.(js|mjs|css|html|json|map|txt)$/.test(f));
} catch {
  console.error(`check-prod-bundle: ${DIST} not found. Run \`npm run build\` first.`);
  process.exit(2);
}
if (files.length === 0) {
  console.error(`check-prod-bundle: no build files in ${DIST}.`);
  process.exit(2);
}

const hits = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [label, needle] of [...DEV_ACCOUNTS, ...HARNESS_MARKERS]) {
    if (text.includes(needle)) hits.push(`${relative(DIST, file)}: ${label}`);
  }
}

if (hits.length) {
  console.error('check-prod-bundle FAILED — dev keys or test-wallet harness in the production build:');
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}
console.log(`check-prod-bundle ok: ${files.length} files, no dev accounts or test-wallet harness.`);
