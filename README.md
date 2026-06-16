# DurianTrust AI - Blockchain & AI Durian Traceability

A Web3 blockchain traceability system integrated with real-time AI quality auditing to secure durian exports from Vietnam to worldwide markets.

## Setup Instructions

Ensure you have [Node.js](https://nodejs.org/) installed, then run the following commands:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Blockchain Node (Hardhat)
```bash
npm run chain
```

### 3. Deploy Smart Contract and Seed Batches
In a new terminal window, run:
```bash
npm run deploy
```
This compiles the Solidity contract, deploys it to the local chain, seeds three mock batches (low risk, medium risk, high risk), and writes the configuration mapping directly to `public/contracts/DurianTrust.json`.

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### 5. Build for Production
To bundle the application for production deployment under the GitHub Pages subpath `/DurainCheckerDemo/`, run:
```bash
npm run build
```

---

## Demo Flows and Features

### 1. Landing Page (`#/`)
- Dynamic interactive overview of Viet Nam durian export hurdles (Cadmium levels & Yellow O chemical dyes).
- Highlighting key solution pillars: Immutable Blockchain Ledger, AI Quality Auditing, and Smart Quarantine Controls.

### 2. Batch Lookup / Telemetry Demo (`#/unit/demo`)
- Search by Certificate ID (`8801`, `8802`, `8803`) or Batch ID (`DRN-2026-LD-0428`) to query the EVM contract.
- Interactive tabs to simulate:
  - **Safe Batch (Low Risk)**: Cadmium level below threshold, AI rating is export-ready.
  - **Review Needed (Medium Risk)**: Near safety limit, prompts warning.
  - **Hold Batch (High Risk)**: Exceeds regulatory limit, AI locks batch quarantine flag.
- Triggers dynamic blockchain timeline and cryptographic hash proofs.

### 3. Operator Console / Management Portal (`#/manage`)
- Admin dashboard to sign transactions and register new durian batches onto the Hardhat ledger.
- Real-time AI Quality Auditor simulation checks input Cadmium values and assigns a quarantine status on-the-fly.
- Append supply chain steps (Harvest, Lab test, Packing, Export) to registered batches.
- *Supports full offline simulation using LocalStorage if local node is unreachable.*

### 4. QR Code & Certificate Verification (`/nft.html`)
- Every registered batch displays a scannable QR code label linking to the verification page.
- Simulates scanning with on-camera guides and laser sweeps.
- Navigates to the certificate verification page (`nft.html`), querying the blockchain ledger by signature and registrant key.
