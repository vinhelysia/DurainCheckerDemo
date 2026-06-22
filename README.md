# DurianTrust AI - Solana Durian Traceability

DurianTrust is a mobile-first traceability app for Vietnamese durian exports. It combines a Solana Anchor ledger, serverless ONNX quality models, QR-code verification, and camera scanning so inspectors and consumers can follow a batch journey from farm to lab to export.

## Architecture

### Solana ledger

- The chain layer is the Solana Anchor program `durian_trust`, deployed on devnet.
- The React app loads the Anchor IDL from `public/solana/idl.json`, connects with `@coral-xyz/anchor` and `@solana/web3.js`, and signs user actions through Phantom via the Solana wallet adapter.
- Program-derived addresses store batch records, role accounts, timeline events, and lab reports. Timeline and lab report entries are append-only so every journey update remains auditable.
- Transaction proofs are displayed as Solana devnet signatures and link to Solana Explorer.
- The app can fall back to local demo data when the devnet RPC or wallet connection is unavailable.

### AI services

Three Python serverless functions run ONNX models on Vercel:

- `api/predict.py`: cadmium-risk prediction for export quality screening.
- `api/predict_disease.py`: environmental disease-risk prediction from orchard conditions.
- `api/predict_leaf.py`: image-based durian leaf disease scanner using a MobileNetV3 classifier with about 88% accuracy.

The management portal calls these endpoints before writing quality reports or batch registrations to Solana.

### Verification UX

- Real QR labels are generated with `qrcode` and encode batch lookup URLs.
- Camera scanning uses `html5-qrcode` with manual fallback input for devices without camera permission.
- The batch verification page is designed mobile-first and presents the batch journey, lab history, risk status, and Solana transaction proof for consumers.

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
- `#/unit/demo`: batch lookup by QR or batch ID, journey timeline, lab report history, and Solana Explorer proof.
- `#/manage`: operator portal for Phantom-signed batch registration, role management, lab report updates, timeline updates, QR label generation, and AI model checks.
