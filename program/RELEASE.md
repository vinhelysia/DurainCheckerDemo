# Contract release candidate

The canonical source is `programs/durian_trust/src/lib.rs`. The files in
`../public/solana/` are generated snapshots, not evidence of a deployed binary.
Attestation v2 was built and tested locally; it has not been deployed in this phase.

## Build and verify

Use Anchor 0.31.1 and the Solana toolchain. CI pins Solana 2.1.21; the local
Windows verification used Solana test-validator 2.1.0.

From `program/`:

```sh
anchor build
cargo test --lib
npm ci --legacy-peer-deps
TEST_VALIDATOR_PATH="$(command -v solana-test-validator)" npm run test:attestation
TEST_VALIDATOR_PATH="$(command -v solana-test-validator)" npm run test:panel
```

On Windows PowerShell, set `$env:TEST_VALIDATOR_PATH` to the full path of
`solana-test-validator.exe`, then run both native-validator scripts. The runner uses
localhost port 18999, generated test wallets, seeded fixtures and a fresh ledger
under `target/`. It needs no devnet SOL or production authority key. It waits for
post-genesis slots before invoking preloaded programs and uses native Ed25519
verification, not a mocked signature verifier. Omit the environment variable to
use the bankrun backend on supported systems; that backend was not run on Windows.

From the app root after a successful build:

```sh
node scripts/sync-contract.mjs --write
node scripts/sync-contract.mjs --check
npm test
npm run lint
npm exec tsc -- --noEmit
npm run build
```

Review the source and generated IDL together. The sync check checks source
snapshots, IDL contents and declared program addresses; it does not check the
on-chain deployment. CI runs the attestation and custody/authority suites on a
local validator. The older `npm test` bankrun suite remains manual because its
genesis-authority fixture needs a specific signer and some cases are skipped.

## Attestation v2 encoding

SHA-256 hashes this Borsh serialization, in order:

| Field | Encoding |
| --- | --- |
| Domain | Fixed 31 bytes: `durian-trust:lab-attestation:v2` |
| Program ID | 32 public-key bytes |
| Batch ID | UTF-8 string with u32 little-endian byte-length prefix |
| Report index | u32 little-endian |
| Cadmium, threshold, confidence | Three u64 little-endian values, using stored units |
| Risk level | u8 enum discriminant (Safe 0, Low 1, Medium 2, High 3, Critical 4) |
| AI result, risk cause | Two independently length-prefixed Borsh strings |
| Reporter | 32 public-key bytes |

The Ed25519 instruction at transaction index 0 signs the 32-byte hash. The
attestation signer must hold the lab role or be the authority; the signature
public key must match that signer. This does not require signer = report author.
The Rust unit tests and `tests/attestation_payload.mjs` share a golden hash vector.

V2 uses PDA seeds `attestation_v2`, batch ID, report index (u32 LE). V1 retains
`attestation`, its existing instruction names and account layout. Existing v1
attestations remain readable; their unprefixed text hashing limitations are not
retroactively repaired. Use v2 for new attestations only after the corresponding
binary has been deployed and verified. No automatic migration is performed.

## Deployment gate

Before a contract upgrade, verify the target cluster genesis hash, program ID,
upgrade authority, payer balance and exact built binary hash. Preserve the prior
binary and deployment evidence. Upgrade only through the authorized authority;
do not create new keys or change declared IDs merely to satisfy legacy tests.
After deployment, run signed v2 creation/verification and v1 compatibility checks
on that cluster and record transaction signatures before enabling v2 callers.
The public frontend currently continues to use its existing instructions.
