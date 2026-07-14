# DurianTrust — Handoff for Presentation Team

**From:** Engineering  
**To:** Pitch / slides / demo narrator  
**Purpose:** Everything you need to present without asking the programmer mid-rehearsal.  
**Network:** Solana **Devnet** (not mainnet).

---

## 1. One-sentence pitch (use this)

> **DurianTrust** gives every Vietnamese durian export batch a digital twin on Solana: harvest → lab (Cadmium) → custody handoffs → QR verify — so customs and buyers can prove safety and ownership in seconds, not days of paperwork.

**Non-crypto line (judges will ask):**  
> Farmers don’t need to “do crypto.” Co-ops / packhouses / labs sign with authorized keys. Consumers and officers only scan a QR. Solana is the unforgeable ledger behind the product, not a currency app for farmers.

---

## 2. Problem (30–45 seconds)

Since 2025, China (GACC) tightened controls on **Cadmium** and **Yellow O dye** in Vietnamese durian.  
Many delays/rejections come from **fragmented paperwork**: paper/PDF lab certs, spoofable region codes, cold-chain records nobody can produce on demand.  
When a shipment is flagged, tracing back to the orchard can take **days** — fruit spoils at the border.

**Sources (cite on slide):** VietnamPlus · MOIT/VNTR · Tuổi Trẻ · SGGP (links in README).

---

## 3. Solution (what we built)

| Layer | What it does |
|--------|----------------|
| **Solana Anchor program `durian_trust`** | Append-only batch ledger: register, lab reports, timeline, **two-step custody** |
| **Rule gate** | Cadmium vs **0.05 ppm** threshold → pass / review / hold (deterministic, not AI black box) |
| **AI assist (ONNX)** | Pre-lab Cadmium risk, disease risk, leaf photo classifier — **screening only**, lab is authority |
| **QR verify** | One code → full journey + custody + explorer proofs |
| **Dual mode** | Live **chain** when wallet+devnet work; explicit **fallback** badge if not (never fake custody) |

### Why this is RWA (Real-World Asset), not just a log

- Physical batch = asset  
- On-chain **Batch PDA** = digital twin  
- **Custody** = who holds liability right now (transferable with consent)  
- We **did not** mint an NFT: ownership is enforced in the program, not a token wrapper

---

## 4. Live demo script (5–7 minutes)

**Prep before stage**

1. Open deployed app (or `npm run dev` → `http://localhost:5173/`).  
2. Phantom installed, network = **Devnet**, demo wallet ready if you will Accept custody.  
3. Backup: screenshots of `#/unit/demo` for batch `DRN-2026-LD-0429` if Wi‑Fi dies.  
4. Confirm green badge **“Live on Solana Devnet”** (not gold “Demo data”).

### Minute 0:00–0:45 — Landing

- Open `#/`  
- Say: export risk + Cadmium + paperwork lag  
- Click **“Scan a demo batch”** → `#/unit/demo`

### Minute 0:45–2:30 — Verify without wallet (judges love this)

**No wallet required.**

Show batch **`DRN-2026-LD-0429`**:

- Timeline (farm → pack → export path)  
- Lab / Cadmium vs **0.05 ppm**  
- **Chain of custody**: real handoffs on devnet; last hop may be **pending accept**  
- Solana Explorer links on signatures  
- Optional: leaf disease sample thumbnail → real ONNX prediction  

**Say:** “Buyer or customs officer never connects a wallet. They only scan.”

### Minute 2:30–4:30 — Operator portal (writes)

Open `#/manage` with Phantom (Devnet).

Pick **one** write path only (don’t do all):

**Option A — Lab story (recommended)**  
1. Role: lab  
2. Submit / show lab report with Cadmium  
3. Point at threshold gate (e.g. 0.06 ppm → high / hold narrative)  
4. Refresh unit page → **latest lab report** is authoritative  

**Option B — Custody story**  
1. Show pending handoff to demo wallet  
2. **Accept custody** → ownership moves only after recipient signs  
3. Say: “No admin seize — authority can pause, not steal batches”

**Option C — Farmer register (if time)**  
1. Register new batch ID  
2. Show it appears without needing logistics first (register is unbundled)

### Minute 4:30–5:30 — Architecture in 60 seconds

```
Farm / Co-op → Lab → Logistics → Exporter
       ↓ sign         ↓ sign      ↓ custody 2-sig
              Solana Batch PDA (source of truth)
       ↑
Consumer / Customs — QR only (read)
```

Roles ≠ ownership:

- **Roles** (`farmer` / `lab` / `logistics`): what you may write  
- **Custody**: who owns this batch (exactly one wallet; transfer needs nominate + accept)

### Minute 5:30–6:30 — Honest “what’s real”

| Feature | Real? |
|---------|--------|
| Register / lab / timeline on devnet | Yes (wallet + SOL) |
| Custody transfer + accept | Yes, **chain only** — no fake fallback |
| Cadmium rule gate 0.05 ppm | Yes, deterministic |
| AI models | Real ONNX; assist only |
| Fallback local ledger | Yes for demo resilience; **badged**; custody disabled there |
| Farmers using Phantom in production | **Demo only** — pilot = co-op/lab keys |

### Minute 6:30–7:00 — Close

> Digital twin of the export batch. Liability moves with custody. Safety gate is auditable. QR for everyone else. Blockchain is the trust backend — not a crypto product for farmers.

---

## 5. Slide outline (8–10 slides)

1. **Title** — DurianTrust · UniHackfest RWA · Vietnamese durian export trust  
2. **Problem** — GACC Cadmium / dye · paper lag · spoilage at border  
3. **Insight** — Batch is an RWA; handoffs move liability  
4. **Product** — Ledger + custody + rule gate + AI screen + QR  
5. **Live demo** (or short video if offline)  
6. **Architecture** — React · Anchor · ONNX · dual mode  
7. **On-chain guarantees** — append-only labs, 2-sig custody, no admin seize, genesis authority  
8. **Go-to-market / practicality** — co-op signs, farmer form/QR, gas sponsored  
9. **What’s next** — pilot 1 exporter + 1 lab; indexer later; not “every farmer a wallet”  
10. **Team / ask**

---

## 6. Hard facts (do not improvise wrong IDs)

| Item | Value |
|------|--------|
| Product name | **DurianTrust** |
| Program | `durian_trust` |
| Program ID | `4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par` |
| Network | Solana **Devnet** |
| Genesis / config authority | `52WpskyDdHaLyAcyTLQrqvLBUh3azKFAe3XmNkYDaFJu` |
| Demo Phantom wallet (custody pending) | `2BARgkoYQPL7ngMerfCh21CpGRepuZdVtMGr7do1ssko` |
| Flagship batch | **`DRN-2026-LD-0429`** |
| Cadmium threshold | **0.05 ppm** (GACC-style constant used in product) |
| Other sample batch IDs | `DRN-2026-TG-0115`, `DRN-2026-DL-0892` |
| App routes | `#/` landing · `#/unit/demo` verify · `#/manage` operators |
| Repo (nested app) | github.com/vinhelysia/DurainCheckerDemo |
| Local run | `npm install` → `npm run dev` → localhost:5173 |
| Devnet SOL | faucet.solana.com |

**UI language:** bilingual VI / EN built-in.

---

## 7. Technical claims that are TRUE (safe for judges)

- Batch registration, lab reports, timeline events are **real Solana txs** when in chain mode.  
- Lab reports are **append-only**; UI treats the **latest** report as authoritative.  
- Register / lab are **not blocked** by logistics timeline (unbundled).  
- Custody requires **transfer + accept**; wrong wallet cannot accept; non-owner cannot transfer.  
- `config.authority` is **not** a backdoor to seize custody (pause ≠ seize).  
- Genesis authority is **hardcoded** in the program for `initialize`.  
- Ed25519 verify path rejects weak/partial instruction layouts (count + index checks).  
- Dual mode is **visible** (Live vs Demo data badge).  
- Custody has **no** localStorage fake path.  
- AI is **pre-screening**, not a replacement for signed lab assay.  
- We intentionally **avoided** SPL NFT mint for the batch.

---

## 8. Do NOT claim (honest gaps)

- ❌ “Already used by government / all farmers in Vietnam”  
- ❌ “Mainnet production with real export clearance”  
- ❌ “Farmers must install Phantom and buy SOL” (that’s demo UX only)  
- ❌ “AI replaces the lab certificate”  
- ❌ “0.05 ppm is a court-certified legal finding” (product constant / GACC-style threshold)  
- ❌ “We have a full centralized database of all national orchards” (chain is source of truth; DB not required for MVP)  
- ❌ “Custody works offline in fallback mode” (it does **not**)  
- ❌ Perfect 100% leaf model accuracy (held-out ~88% on test set — say “assistive screening”)

---

## 9. Likely Q&A (short answers)

**Q: Why blockchain? Why not only a database?**  
A: Multi-party export chain doesn’t share one trusted DB. Append-only ledger + public verify + custody consent. A DB can index later; it shouldn’t be the only proof.

**Q: Will farmers use crypto?**  
A: No. Pilot: co-op/packhouse/lab hold keys; farmers use form/SMS/app; buyers scan QR; company sponsors fees.

**Q: Why Solana?**  
A: Low fees, fast finality for many batch events; Anchor program model; Phantom for demo signing.

**Q: Why not NFT?**  
A: Ownership rules live in the program. NFT mint/ATA complexity doesn’t add the custody guarantee we already enforce.

**Q: What if admin is malicious?**  
A: Admin can pause; cannot reassign custody they don’t hold. Roles are grants; custody is separate.

**Q: What if Wi‑Fi fails on stage?**  
A: `#/unit/demo` still shows data with **Demo data** badge; explain dual mode. Custody demo needs chain — use screenshot backup.

**Q: Cadmium number source?**  
A: Product uses **0.05 ppm** as the GACC-oriented safety threshold constant for the rule gate; not a substitute for official lab legal process.

**Q: What’s proven on-chain already?**  
A: Program deployed on devnet; farmer-only register and lab-only report smokes passed; flagship batch has lab + timeline + custody history with pending accept to demo wallet.

---

## 10. Speaker roles (suggested)

| Person | Owns |
|--------|------|
| **Presenter** | Problem, story, demo click path, Q&A narrative |
| **Programmer (you)** | Stand by for: wallet stuck, wrong network, RPC down, “show explorer tx”, deep technical Q |
| **Backup** | Phone hotspot + offline screenshots of `DRN-2026-LD-0429` |

**Programmer stage rules**

- Don’t open VS Code unless asked.  
- Don’t redeploy mid-demo.  
- If chain fails: switch to verify page + honest dual-mode explanation (still a feature).  
- If judge asks code: point to program + Explorer, 30 seconds max.

---

## 11. Copy-paste blurbs

**For slide footer / one-pager**  
DurianTrust — Solana-verified durian export batches: Cadmium gate, chain of custody, QR traceability.

**For Zalo/Slack to judges after**  
Try without wallet: open app → Scan demo batch → `DRN-2026-LD-0429`.  
Program: `4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par` (devnet).

**VI pitch line**  
DurianTrust gắn sổ cái Solana cho từng lô sầu riêng xuất khẩu: kiểm Cadimi, chuyển giao trách nhiệm 2 chữ ký, quét QR là thấy hành trình — nông dân không cần “chơi crypto”.

---

## 12. Engineering checklist for demo day (programmer)

- [ ] `npm run build` green  
- [ ] Devnet reachable; flagship batch loads with Live badge  
- [ ] Phantom on Devnet; demo wallet funded if Accept custody is in script  
- [ ] Seed already done (`DRN-2026-LD-0429`); don’t re-seed mid-event unless broken  
- [ ] Explorer links open  
- [ ] Leaf sample prediction works (or skip if API cold start — don’t panic)  
- [ ] Screenshots + short screen recording backup  
- [ ] This file shared with presentation owner  

**Useful commands (local)**  
```bash
npm run dev
npm run seed:devnet    # only if flagship missing/broken
npm run smoke:farmer   # optional proof
npm run smoke:lab      # optional proof
```

---

## 13. Message you can send the presentation person (copy all)

```
Hey — I’m on engineering, not slides. Here’s everything you need for DurianTrust.

PITCH (1 line):
DurianTrust = digital twin on Solana for VN durian export batches: lab Cadmium + 2-step custody + QR verify in seconds, not days of paper.

CRITICAL DEMO (no wallet):
1) Open app → “Scan a demo batch”
2) Batch ID: DRN-2026-LD-0429
3) Show timeline, lab vs 0.05 ppm Cadmium, chain of custody, Explorer links
4) Optional: leaf disease sample click

WITH WALLET (optional 1 action only):
#/manage + Phantom Devnet → either Accept custody OR submit lab — don’t do everything.

KEY IDs:
- Program: 4EZcqRn9LYK5VMuhLC2bNDaUqVBHxc6KCZ6zhFet3Par
- Network: Solana Devnet
- Threshold: 0.05 ppm Cadmium
- Demo wallet (pending custody): 2BARgkoYQPL7ngMerfCh21CpGRepuZdVtMGr7do1ssko

ALWAYS SAY:
- Farmers don’t need crypto wallets in real deployment (co-op/lab sign; QR for public)
- AI is assist only; signed lab + rule gate are the audit path
- Custody is real two-signature; no admin can seize batches
- If offline: Demo data badge is intentional dual-mode, not a silent fake

DON’T SAY:
- Already nationwide / mainnet production
- AI replaces lab
- Fallback fakes ownership

Full handoff doc: PRESENTATION_HANDOFF.md in the repo.
I’ll be on standby for technical Q&A and if the wallet breaks.
```

---

*Generated for UniHackfest-style presentation. Facts aligned with repo README + program/scripts as of handoff. If live batch state drifts, re-check `#/unit/demo` for `DRN-2026-LD-0429` before stage.*
