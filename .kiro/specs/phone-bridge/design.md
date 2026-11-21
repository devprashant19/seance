# Design Document — phone-bridge

## Overview

```
 Phone browser (/join/CODE)          seance-relay (Node + ws)            Laptop app (host)
 ┌──────────────────────┐   wss    ┌────────────────────────┐   wss   ┌──────────────────────────┐
 │ phone-client          │ ───────► │ Room CODE               │ ◄─────► │ createPhoneBridgeHost()   │
 │  permission tap       │ ◄─────── │  host · peers[] · obs[] │         │  ClockSync per peer       │
 │  sensor capture       │          │  fan-out, limits, expiry│         │  PhoneSpirit (BaseSpirit) │
 │  50 ms batcher        │          └────────────▲───────────┘         │  HealthMonitor            │
 │  clock-sync responder │                       │ observer (key)      └──────────────────────────┘
 │  wake lock, reconnect │                 seance-mcp (Phase 7)
 └──────────────────────┘
```

- The relay is **dumb**: it routes messages by room and role, enforces limits and expiry, and never interprets sample data.
- All intelligence (clock sync, unit conversion, health, spirits) lives in `seance-core` so it is unit- and property-testable in Node.
- Message schemas, the reconnection state machine and versioning: `phases/phase-03-phone-bridge/protocol.md`. Relay internals and hosting: `relay-server.md`. Test procedures: `test-plan.md`.

## Architecture

### Packages and files

```
packages/seance-relay/
  src/server.ts        HTTP server (/healthz) + ws upgrade + origin check
  src/rooms.ts         Room registry, codes, expiry timers, capacity
  src/routing.ts       role-based fan-out (peer→host, host→peer, *→observers)
  src/limits.ts        per-connection token bucket, message size cap
  test/                Vitest against an in-process server on a random port

packages/seance-core/src/transports/phone-bridge/
  protocol.ts          message types + version constant (shared by phone, host, relay, mcp)
  host.ts              createPhoneBridgeHost(): room creation, peer→PhoneSpirit mapping
  phone-spirit.ts      PhoneSpirit extends BaseSpirit; applies offset, emits SampleBatch
  clock-sync.ts        ClockSync: exchanges, min-RTT selection, drift fit (pure core + timer shell)
  phone-client.ts      capture, convert, batch, respond to sync, wake lock, reconnect
  reconnect.ts         backoff policy + resume-token handling (pure, testable)
  fake-relay.ts        in-memory relay for contract tests
```

Each app (`poltergeist-lab`, `banshee-choir`) has a `/join/:code` route that renders a tiny page using `phone-client.ts`. The phone page must load fast on mobile data: target < 100 KB JS for the join route (lazy-load everything else).

### Sequence — join and stream

```
Laptop                  Relay                      Phone
  │ hello{role:host}      │                          │
  │──────────────────────►│ create room ABCD         │
  │◄── welcome{room,hostToken}                       │
  │ show QR /join/ABCD    │                          │
  │                       │◄── hello{role:peer,room,peerId}  (page load)
  │◄── peer-joined{peerId}│── welcome{resumeToken} ─►│
  │                       │                          │ user taps "Begin" → requestPermission()
  │                       │◄── ready{capabilities}───│
  │ new PhoneSpirit(summoning)                       │
  │── sync{t0} ──────────►│────────────────────────► │
  │                       │◄── sync-reply{t0,t1,t2} ─│
  │◄──────────────────────│  (t3 = now)              │
  │                       │◄── batch{seq,channels…} ─│ every ~50 ms
  │◄──────────────────────│                          │
  │ first batch → present │                          │
```

## Components and Interfaces

### Host API

```ts
interface PhoneBridgeHost {
  readonly room: { code: string; joinUrl: string; expiresAt: number };
  onSpirit(cb: (spirit: Spirit) => void): () => void;     // fires on each peer "ready"
  spirits(): Spirit[];
  close(): Promise<void>;
}
function createPhoneBridgeHost(opts: {
  relayUrl: string;                 // VITE_RELAY_URL
  appOrigin: string;                // for joinUrl
  maxPeers?: number;                // default 8
  clockSync?: { intervalMs?: number; keep?: number };   // 2000, 16
  webrtc?: boolean;                 // default false (Requirement 10)
}): Promise<PhoneBridgeHost>;
```

### Phone client API

```ts
function startPhoneClient(opts: {
  relayUrl: string; room: string;
  channels: ('motion' | 'orientation' | 'mic')[];
  batchMs?: number;                 // default 50
  onState(state: 'connecting' | 'waiting-tap' | 'streaming' | 'reconnecting' | 'ended' | 'denied' | 'insecure'): void;
}): { begin(): Promise<void>;       // MUST be called from the tap handler
      stop(): void };
```

### ClockSync (pure core)

```ts
interface SyncSample { t0: number; t1: number; t2: number; t3: number }
function offsetAndDelay(s: SyncSample): { theta: number; delta: number };
function estimate(samples: SyncSample[], keep = 16): { offsetMs: number; driftPpm: number; rttMs: number; quality: 'good' | 'fair' | 'poor' };
function toHostTime(tPhone: number, est: { offsetMs: number; driftPpm: number; refHostMs: number }): number;
```

Selection: take the last `keep` samples, keep those with δ ≤ 25th percentile δ (at least 3), fit θ against `t3` by least squares → intercept + slope; `driftPpm = slope × 10⁶`; `offsetMs` evaluated at "now". `quality` is `good` if median δ < 100 ms and fit residual < 5 ms.

### PhoneSpirit

- `kind: 'poltergeist'`, `transport: 'phone-bridge'`.
- On `batch`: convert each sample time with `toHostTime`, build one `SampleBatch` per channel (`accel`, `accelG`, `gyro`, `orientation`), emit via `BaseSpirit.emitBatch`.
- Detects `seq` gaps → `HealthMonitor.recordDropout(n)`.
- On `peer-hidden` → state `fading`, reason "The phone screen is off".
- On `peer-left` without resume within 2 min → `banished`.

### Reconnect policy (pure)

`nextDelay(attempt) = min(5000, 250 × 2^attempt) × (0.8 + 0.4 × rand)`; give up after 120 s total. The resume token is an opaque random string issued by the relay and bound to `(room, peerId)`.

## Data Models

Defined in `protocol.ts`, documented with examples in `protocol.md`:

- Envelope: `{ v: 1, type: string, room?: string, from?: string, to?: string, ... }`
- Control: `hello`, `welcome`, `error`, `peer-joined`, `peer-left`, `peer-hidden`, `peer-visible`, `ready`, `sync`, `sync-reply`, `bye`, `rtc-offer`, `rtc-answer`, `rtc-ice` (optional).
- Data: `batch` — columnar arrays per channel group:

```json
{ "v": 1, "type": "batch", "seq": 812,
  "motion": { "t": [123456.1, 123466.3], "ax": [0.01, 0.02], "ay": [...], "az": [...],
              "gx": [...], "gy": [...], "gz": [...], "gax": [...], "gay": [...], "gaz": [...] },
  "orientation": { "t": [...], "alpha": [...], "beta": [...], "gamma": [...] } }
```

Phone times are `performance.now()` + `performance.timeOrigin` (epoch ms, phone clock). Units on the wire are already canonical (m/s², rad/s, rad).

## Error Handling

| Situation | Phone shows | Host does |
|---|---|---|
| Not HTTPS | "Sensors need a secure link" | nothing |
| Permission denied | one-line fix + "Watch a recorded haunting" link | spirit never created |
| No motion events after 2 s | "This browser doesn't share motion — try Chrome or Safari" | spirit `error` |
| Room missing/expired | "This séance has ended" | — |
| Circle full | "The circle is full (8 spirits)" | — |
| Socket drop | "Reconnecting…" spinner, backoff | spirit `fading` |
| Background tab | (not visible) | spirit `fading`, reason "phone screen is off" |
| Relay down | "The spirit world is unreachable" + retry | banner + replay mode suggestion |
| Protocol version mismatch | "Please reload" | ignore peer |

## Testing Strategy

- **Pure units:** `clock-sync.ts`, `reconnect.ts`, batch (de)serialisation — Vitest + fast-check (properties 3.7, 4.6, 4.7, 1.6).
- **Relay:** in-process server tests for rooms, expiry (fake timers), capacity, origin rejection, rate limiting, observer key.
- **Contract:** `runSpiritContract('phone-bridge', …)` with `fake-relay.ts` and a scripted fake phone.
- **Manual/device:** latency, lock/unlock, iOS, hotspot, 3+ phones — `phases/phase-03-phone-bridge/test-plan.md`.
- **E2E (optional):** Playwright with two browser contexts (one emulating the phone with synthetic `devicemotion` events).
- **Hook H3** runs contract + reconnection tests whenever a file in `transports/` is saved.
