# Deploying durian_trust via Solana Playground

No local Anchor CLI / solana-test-validator is available — build and deploy
through beta.solpg.io instead.

## Build & deploy

1. Open https://beta.solpg.io and create a new Anchor project.
2. Paste `programs/durian_trust/src/lib.rs` into `src/lib.rs`, overwriting the template.
3. Click **Build**. Playground assigns a fresh program keypair and shows its pubkey.
4. Switch cluster to Devnet, airdrop SOL to the Playground wallet if needed, then **Deploy**.
5. Copy the deployed program id shown in Playground.

## Post-deploy sync (do this every time the program id changes)

6. Set `declare_id!("<PROGRAM_ID>")` in both:
   - `program/programs/durian_trust/src/lib.rs`
   - `public/solana/lib.rs` (must stay byte-identical to the file above)
7. Set `"address": "<PROGRAM_ID>"` in `public/solana/idl.json`.
   Discriminators in that file are already canonical — do **not** change them.
8. Paste `program/tests/anchor.test.ts` into Playground's Tests tab and run it
   against devnet to sanity-check the deployed program.
9. From `durian-web3/`, run `npm run build` — must be green.
10. Open `#/unit/demo` in the built app and confirm the provenance badge shows
    the live "● on Solana Devnet" state (not the demo-data fallback).
