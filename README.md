# Mirage Shield — Silent Two-Tier Antifraud & Honeytrap Sandbox

> Built for **THE CIS SPRINT Hackathon (B2C Fintech Track)**.
> Protects banking customers during live social-engineering phone calls by silently diverting coerced transfers into a believable shadow ledger (**Mirage**), capturing scammer mule accounts via a realistic **CB-412 Honeytrap**, and alerting a trusted family contact inside the bank app — while keeping real funds **100% immutable**.

---

## The Problem

When a fake bank security caller convinces a victim to enable screen sharing ("to help cancel an unauthorized `14,500 AED` debit"), a standard red _"FRAUD ALERT — BLOCKED"_ screen fails:

1. The scammer **sees the warning live** on the shared screen.
2. The scammer tells the victim the app is glitching and **sends them to a physical ATM** to withdraw cash, where the bank loses all visibility.

## Our Solution: Invisible Defense + Active Honeytrap

Instead of tipping off the attacker, **Mirage Shield** combines real-time behavioral telemetry with semantic AI and responds silently:

```text
Active Call + OS Telemetry + Transcript
        │
        ├──► Tier 1 · Algorithm Level (<1 ms, deterministic)
        │      • OS flags (UNVERIFIED_INBOUND_CALL, SCREEN_CAPTURE_ACTIVE,
        │        YOUNG_SIM_CALLER, EXTERNAL_RECIPIENT_INJECTED,
        │        VAULT_WITHDRAWAL_ON_CALL, HIGH_VALUE_DRAIN_RATIO)
        │      • Multilingual EN/RU rules & syntactic constructions
        │        (SYNTAX:FAKE_REVERSAL_PARADOX, TIME_CUTOFF_PRESSURE)
        │
        └──► Tier 2 · AI Semantic Level (Claude Haiku 5.5, async over WS)
               • Detects subtle euphemisms & implicit coercion (0–100%)
               • Backed by Pre-Transfer Gate (holds Confirm up to 3.5s
                 for in-flight AI verdict + 3-min post-call cooldown)
        │
        ▼ Ensemble Score >= 65 during active call / cooldown
┌────────────────────────────────────────────────────────────────┐
│ MIRAGE SANDBOX ENGAGED (Invisible on phone screen)             │
│ • Real Core Vault locked (realAccounts NEVER decrease)         │
│ • Sensitive account/card/history masked during screen sharing  │
│ • Attempt #1 → Realistic CB-412 limit error baits backup IBAN  │
│ • Attempt #2 → Decoy "Transfer Complete" receipt & Ref #       │
│ • Post-call reveal ("No money was sent") + Family Guardian     │
└────────────────────────────────────────────────────────────────┘
```

---

## Interactive Demo Scenarios (4 Contrasting Cases)

The stage (`/`) pairs a real-time **Private Bank View** with an interactive **Mobile Bank App** (also available standalone at `/mobile` synced live via WebSocket):

| Case            | Type         | What it demonstrates                                                                                                                                                                                                    |
| --------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Refund Scam** | Scam         | Fake bank security + screen share + `14,500 AED` mirror-reversal paradox. Tier 1 crosses `65%` in `<1 ms`, Haiku confirms `~98%`, Honeytrap captures 2 mule IBANs (`CB-412` → decoy receipt), real debit = **`AED 0`**. |
| **Stealth AI**  | Scam         | Euphemistic scam with **no screen share and no stop-words** (`3,500 AED`). Tier 1 stays `<30%`, while **Tier 2 Haiku 5.5 + Pre-Transfer Gate** catch coercion live before funds move.                                   |
| **du Vault**    | Scam         | 2-day fresh SIM pushing a withdrawal from `Family Savings Vault` (`YOUNG_SIM_CALLER` + `VAULT_WITHDRAWAL_ON_CALL`).                                                                                                     |
| **Legit Call**  | Safe Control | Saved contact discussing dinner (`500 AED`). Risk stays green (`<15%`), Mirage never triggers, real transfer settles normally (`24,500 → 24,000 AED`).                                                                  |

### Additional Built-in Defenses (Hardened & Tested)

- **Screen-Share Privacy Masking:** Masks account/card/IBAN digits, locks `View details`, and hides transaction history automatically while screen sharing is active.
- **In-App Family Guardian Alert:** Switchable guardian view inside the banking app showing intercepted attack summary, protected balance, and captured mule IBANs.
- **Cover Support AI Chat:** Live Haiku-powered banking chat that stays calm and preserves the decoy illusion while the scammer watches the screen.
- **Red-Team Hardening:** Defends against hangup-before-confirm bypass (`3 min` post-call cooldown), cumulative smurfing splits, same-IBAN retries, and concurrent double-tap debits (mutex + `2.5 s` dedup window).

---

## Tech Stack

- **Runtime & PM:** Bun (`1.4+`)
- **Backend:** Hono + tRPC v11 + Zod + native Bun WebSocket (`/ws`)
- **AI Semantic Engine:** Claude Haiku 5.5 via OpenAI-compatible gateway (with deterministic local fallback when offline)
- **Frontend:** Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + Motion (`EN` / `RU` i18n)
- **Tooling:** `tsc --noEmit`, `oxlint`, `oxfmt`, `bun test` (`35` unit & handler tests)

---

## Quick Start

```bash
bun install
cp .env.example .env   # optional: add AI_GATEWAY_URL / AI_GATEWAY_TOKEN / AI_MODEL for live Haiku 5.5
bun run dev
```

- **Demo Stage (Private Bank View + iPhone):** `http://localhost:5173`
- **Standalone Mobile Wallet (WS-synced):** `http://localhost:5173/mobile`
- **API Health:** `http://127.0.0.1:3001/api/health`

### Verification Commands

```bash
bun run check-types
bun run lint
bun run format:check
bun run test
bun run build
```

Live scenario & real-time latency probes:

```bash
bun run scripts/probe-scenarios.ts
bun run scripts/benchmark-realtime.ts
```
