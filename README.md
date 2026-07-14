# DurianTrust

**Blockchain-verified durian exports — from farm to customs, in seconds instead of days.**

DurianTrust is a mobile-first traceability app for Vietnamese durian exports. It combines a Solana Anchor ledger, serverless ONNX quality models, and QR-code verification so an inspector, exporter, or customs officer can trace a batch's full journey — and its Cadmium safety record — from a single scan.

## The problem

Since 2025, Chinese customs has tightened import controls on Cadmium and Yellow O (Auramine O) dye in durian shipments. Many of the resulting rejections and delays aren't caused by bad fruit — they're caused by fragmented paperwork: lab certificates on paper or PDF, planting-region codes that get reused or spoofed, and cold-chain records nobody can produce on demand. When a shipment gets flagged, tracing it back to the source orchard can take days, and by then the rest of the batch has already spoiled at the border.

Sources: [VietnamPlus](https://en.vietnamplus.vn/vietnam-steps-up-quality-control-of-durian-exports-to-retain-billion-dollar-market-post321595.vnp) · [MOIT/VNTR](https://vntr.moit.gov.vn/news/china-tightens-import-rules-on-vietnamese-durians) · [Tuổi Trẻ](https://tuoitre.vn/sau-rieng-xuat-khau-sang-trung-quoc-giam-sau-bo-truong-do-duc-duy-chi-dao-loat-giai-phap-20250508164730467.htm) · [SGGP](https://en.sggp.org.vn/vietnams-durian-industry-reeling-as-china-rejects-shipments-over-contaminants-post117622.html)

## The solution

DurianTrust gives every export batch a digital trust layer:

- **An append-only blockchain ledger.** Harvest, lab test, packing, and export are each recorded as a Solana transaction that can't be edited after the fact.
- **A transferable chain of custody.** Each batch has an on-chain owner that moves along the export chain — farm → packhouse → exporter → importer → customs. A handoff takes two signatures: the current holder nominates the next one, and *the recipient must sign to accept*. Nobody can push a rejected batch onto a wallet that didn't consent to receive it, and the platform authority cannot seize a batch it doesn't hold.
- **A Rule-Based Quality Gate.** Cadmium assay results are checked against the customs safety threshold (0.05 ppm) the moment they're entered, producing an auditable pass/review/hold verdict.
- **AI-assisted screening.** Two ONNX models forecast Cadmium and disease risk *before* a full lab assay is run, and a third classifies durian leaf photos for common diseases — so problems can be caught earlier in the chain.
- **One QR code per batch.** Scanning it opens the same verification page a judge, buyer, or customs officer would see, with the batch's full timeline, custody chain, and ledger proof.

### Why this is an RWA problem, not just a logging problem

A durian batch is a real asset that changes hands four or five times before it clears a border, and every one of those handoffs is where liability moves. Recording *that* — who holds the asset, who accepted it, where, and under which role — is what turns a traceability log into an ownership record. The physical batch is the asset, the Batch PDA is its digital twin, and custody is the transferable right over it. Value flows along the same edges.

The batch is deliberately **not** minted as an SPL/Metaplex NFT. A mint would add mint accounts, ATAs and CPI plumbing while changing nothing about what is actually proven; an NFT would be a wrapper over exactly the state the program already enforces. The ownership guarantee lives in the program, not in a token standard.

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser — React 19 + Vite SPA"]
        UI["Landing · #/unit/demo · #/manage"]
        Phantom["Phantom Wallet Adapter"]
    end

    subgraph Devnet["Solana Devnet"]
        Program["Anchor program: durian_trust"]
        PDAs["Batch / LabReport / TimelineEvent /\nCustodyRecord / Role accounts"]
    end

    subgraph AI["Vercel Python Serverless Functions (ONNX)"]
        Predict["/api/predict\nCadmium risk"]
        Disease["/api/predict_disease\nEnvironmental disease risk"]
        Leaf["/api/predict_leaf\nLeaf image classifier"]
    end

    Fallback[["Bundled demo data +\nlocalStorage fallback ledger"]]

    UI -- "reads (getProgramAccounts)" --> Program
    UI -- "signs writes via" --> Phantom
    Phantom -- "sendAndConfirm" --> Program
    Program --- PDAs
    UI -- "pre-lab forecasts" --> Predict
    UI --> Disease
    UI -- "sample or uploaded photo" --> Leaf
    UI -. "devnet unreachable" .-> Fallback
```

The React app is the single source of truth for the UI. It reads batch state directly from Solana devnet program accounts, calls the three AI endpoints for risk forecasting, and — only when devnet or Phantom is unavailable — falls back to bundled demo data or a localStorage-simulated ledger. The fallback is never hidden: the UI always shows which mode it's in.

## Judge quickstart

**No wallet required to see it work.** Everything below the fold is real, running code — not mocked screenshots.

1. Open the app and click **"Scan a demo batch"** on the landing page. This lands on `#/unit/demo`, which works with zero setup: no wallet, no devnet SOL, no install step. If devnet happens to be unreachable, the page says so explicitly (a gold "Demo data" badge instead of a green "Live on Solana Devnet" one) and still shows a fully realistic batch record.
2. Look at the **chain of custody** panel next to the timeline. Batch `DRN-2026-LD-0429` has really changed hands twice on devnet — farm → packhouse → exporter — and each hop links to the signing wallet on Solana Explorer. The last entry is a handoff that is still **unsigned**: ownership has not moved, because the recipient hasn't accepted yet.
3. Scroll to the **leaf disease scanner** and click one of the sample thumbnails — it runs the real ONNX model and returns a prediction in one click, no file upload needed.
4. To take custody yourself, open `#/manage` with [Phantom](https://phantom.app/) on **Devnet**. The pending handoff above is addressed to the demo wallet; if you're holding it, the portal shows an **Accept custody** form and nothing else — because the program will only let the nominated recipient sign. Accepting moves `Batch.owner` and appends a permanent `CustodyRecord`.
5. To try the rest of the **write path** (registering a batch, submitting a lab report, logging a timeline event), grab free devnet SOL from **[faucet.solana.com](https://faucet.solana.com)**. The app detects a missing wallet or an empty devnet balance and tells you what to do. Every submitted form has a **"Fill sample data"** button so you don't have to invent realistic values by hand.

**The rules worth testing.** Try to transfer a batch your wallet doesn't hold — the program rejects it. There is no admin override: the `config.authority` (the key that deployed the program) is *not* an escape hatch for custody, because an admin who could reassign ownership could seize any batch, and the ownership record would mean nothing. Admin power stops at `pause` — halt everything, seize nothing.

## What's on-chain vs. simulated

We'd rather be upfront about this than have you find out mid-demo:

| Feature | Status |
|---|---|
| Batch registration, lab reports, timeline events | **Real** — Solana devnet transactions via the `durian_trust` Anchor program, when a wallet is connected and devnet is reachable. Falls back to a localStorage-simulated ledger otherwise, always clearly badged. |
| Chain of custody (ownership transfer) | **Real, and chain-only.** `transfer_custody` + `accept_custody` on devnet, both signatures required. There is deliberately **no fallback** for this one: the localStorage ledger cannot prove who owns anything, and simulating a transfer of ownership would fake the exact guarantee the feature exists to demonstrate. Without devnet, the portal refuses and says why. |
| Cadmium risk pre-lab forecast (`/api/predict`) | **Real** ONNX model on Vercel serverless. Falls back to a local JS heuristic if the function is unreachable (also badged). |
| Disease risk forecast (`/api/predict_disease`) | **Real** ONNX model on Vercel serverless, same fallback behavior. |
| Leaf disease image classifier (`/api/predict_leaf`) | **Real** ONNX MobileNetV3 classifier (~88% accuracy on the held-out test set). |
| Rule-based quality gate (Cadmium threshold check) | **Deterministic JS**, not AI — this is what actually gets written on-chain as the audit verdict, by design (auditable, not a black box). |
| QR codes | **Real** — generated client-side and encode real deep links back into the app. |
| Transaction proofs / Solana Explorer links | **Real** devnet signatures when on-chain; explicitly labeled `simulated, not on-chain` in fallback mode. |

## Tech stack

- **Frontend:** React 19, Vite, hash-based routing, `lucide-react` icons, hand-rolled dark glassmorphism design system (no CSS framework)
- **Chain:** Solana (devnet), Anchor framework, `@coral-xyz/anchor` + `@solana/web3.js`, Phantom via `@solana/wallet-adapter-react`
- **AI:** ONNX Runtime models served from Python functions on Vercel (Cadmium risk, disease risk, leaf image classification)
- **QR:** `qrcode` for generation, `html5-qrcode` for camera scanning
- **i18n:** Custom bilingual (VI/EN) copy system, no external i18n library

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file if you need a custom devnet RPC:

```bash
VITE_RPC_URL=https://api.devnet.solana.com
```

Run the app locally:

```bash
npm run dev
```

Open `http://localhost:5173/` and connect Phantom on Solana devnet to submit signed transactions.

Build for production:

```bash
npm run build
```

## Anchor Program

The Anchor program is maintained and deployed through Solana Playground on devnet. After a Playground build/deploy, export the updated IDL and program address into `public/solana/idl.json` so the React app can derive the correct PDAs and submit transactions.

Solana signing is handled by Phantom in the browser. The old EVM `.env` `PRIVATE_KEY` is no longer required and should not be used by this app.

## App Flows

- `#/`: bilingual product overview for durian traceability, AI screening, and blockchain verification.
- `#/unit/demo`: batch lookup by QR or batch ID, journey timeline, chain of custody, lab report history, and Solana Explorer proof.
- `#/manage`: operator portal for Phantom-signed batch registration, role management, lab report updates, timeline updates, custody handoff and acceptance, QR label generation, and AI model checks.

## Roles vs. ownership

These are two different things, and the program treats them that way.

**Roles** (`farmer`, `lab`, `logistics`) are grants from the program authority that say *what kind of write you may perform* — who can register a batch, who can file a lab report, who can log a timeline event. They are revocable and they are not scarce.

**Custody** is ownership of a specific batch. It is not a role, it is not granted by an admin, and it is held by exactly one wallet at a time. An importer with no role grant at all can still be handed a batch and still pass it on; a `logistics` role holder who doesn't own the batch cannot move it. That's why the custody panel sits outside the role tabs in `#/manage`.

## Testing

```bash
cd program && npm install --legacy-peer-deps && npm test
```

The suite runs the Anchor program in-process with `anchor-bankrun` and covers the custody rules directly: a non-owner cannot propose a handoff, a wallet that was not nominated cannot accept one, ownership does not move until acceptance, and a previous owner cannot move a batch it has already passed on.

> **Note:** these tests do not run on Windows. `solana-bankrun` ships no win32 native binary, and `solana-test-validator` needs symlink privileges. Run them on Linux/macOS or in CI; on Windows, verify against devnet instead.
