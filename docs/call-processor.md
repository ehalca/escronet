# Call Processor

The Call Processor is split into two layers. This document covers the **Background service** (2.1.1.1). The Analyzer (2.1.1.2) is described in `analyzer.md` _(forthcoming)_.

---

## Background service

Registers with the OS to receive call lifecycle events while the app is in any state (foreground, background, killed). On each `RINGING` event it performs an immediate risk assessment using pre-known data (contact list + local scam-number store) and takes one of the actions below before any Analyzer work begins.

---

## Risk level handling at RINGING

### HIGHEST — short circuit (block)

The caller's number is on the verified blocked list. The call is rejected immediately without user interaction.

**Actions (in order):**

1. Block / reject the incoming call at the OS level by emitting BLOCK_CALL_AUTO event.

**If USER taps Unblock:**

- Release the block for this number on this device.
- Emit `LOCAL_PHONE_UN_BLOCK` to backend.
- If GUARDIAN is configured → emit `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK` to backend.
- When GUARDIAN's device acknowledges the notification → emit `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK_READ`.

Analyzer is **not started**. The call is fully handled by the background service.

---

### NONE — short circuit (pass)

Caller is a saved contact. No action. Analyzer is **not started**.

---

### HIGH — partial short circuit

Caller is on the verified scam list but not in the BLOCK tier.

**Actions:**

1. Emit `HIGH_LEVEL` event to backend (includes call metadata).
2. Backend notifies GUARDIAN if configured.
3. Start **Analyzer**.

---

### MEDIUM — non-short circuit

Caller has unverified community reports.

**Actions:**

1. Emit `MEDIUM_LEVEL` event to backend (includes call metadata).
2. Start **Analyzer**.

---

### LOW / LOWER — non-short circuit

Caller is unknown or has minimal crowd signal.

**Actions:**

1. Start **Analyzer**.

---

## Backend events

All events are emitted to `REMOTE_SUPPORT` (backend). Events are fire-and-forget from the background service's perspective — the service does not block on a response.

| Event                                 | Trigger                                                 | Payload                                      |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `CALL_BLOCKED`                        | HIGHEST number blocked by background service            | caller number hash, timestamp                |
| `LOCAL_PHONE_UN_BLOCK`                | USER tapped Unblock on the blocked-call notification    | caller number hash, timestamp                |
| `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK`      | GUARDIAN notified that USER unblocked a call            | caller number hash, GUARDIAN ID, timestamp   |
| `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK_READ` | GUARDIAN's device acknowledged the unblock notification | caller number hash, GUARDIAN ID, timestamp   |
| `HIGH_LEVEL`                          | Call from HIGH-risk number detected                     | caller number hash, call metadata, timestamp |
| `MEDIUM_LEVEL`                        | Call from MEDIUM-risk number detected                   | caller number hash, call metadata, timestamp |

---

## Local events

| Event             | Trigger                                          | Payload                       |
| ----------------- | ------------------------------------------------ | ----------------------------- |
| `BLOCK_CALL_AUTO` | Call blocked automatically by background service | caller number hash, timestamp |

## Analyzer handoff

When the background service starts the Analyzer, it passes:

- Caller phone number (hashed)
- Initial risk level assigned by this service
- Call start timestamp

The Analyzer takes over from that point. See `analyzer.md` for its contract.
