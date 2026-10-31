# lightwalletd protos (vendored)

`service.proto` and `compact_formats.proto` from
https://github.com/zcash/lightwalletd/tree/master/walletrpc at commit
909dee87dcc1de876ee536ae1fdb26c005df7a7b (MIT License, Electric Coin Company).
Used by `../../tx-check.service.js` to look up a testnet transaction
(`GetTransaction`) and its shielded parts (`GetBlock`, including
`ironwoodActions`). Update both files together.
