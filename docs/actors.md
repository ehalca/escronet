# Actors

## Human actors

### USER
The person who installs the app and is the primary subject of protection. Receives local notifications when a suspicious call is detected. Configures their GUARDIAN in the app settings. Has no moderation or administrative privileges.

### GUARDIAN
*(referred to as "designated contact" in the current data model)*

A person the USER nominates — typically someone tech-savvy who understands scam tactics. The GUARDIAN does not need to have the app installed. They receive a push notification (FCM) when the USER's call escalates to risk level HIGHEST, giving them the opportunity to intervene.

A USER has at most one active GUARDIAN at a time.

### MODERATOR
Reviews and verifies scam reports submitted by USERs and GUARDIANs via the backend dashboard. Transitions report status from `UNVERIFIED` → `VERIFIED` or `DISMISSED`. Responsible for the quality of the shared scam-number database. Cannot manage other accounts.

### ADMIN
Manages the platform: unblocks phone numbers, promotes/demotes MODERATOR accounts, manages USER accounts. Has full access to the backend dashboard. Does not typically interact with call data directly.

---

## System actors

### CALL_ANALYZER
Evaluates incoming call data and assigns a risk level (NONE → HIGHEST). Combines signals from contact status, call duration, crowd data, and classifier output. Runs on the mobile device. See [risk-levels.md](risk-levels.md) for the full signal-to-level mapping.

### MOBILE_SUPPORT
Acts on risk level decisions on the device. Responsibilities:
- Show / dismiss local notifications and in-call alerts
- Trigger UI state changes (warning banners, popups)
- Request CALL_ANALYZER re-evaluation when new signals arrive
- Invoke REMOTE_SUPPORT when the risk level requires server-side action

### REMOTE_SUPPORT
Acts on risk level decisions on the server. Responsibilities:
- Forward HIGHEST-level alerts to the USER's GUARDIAN via FCM
- Register and store scam reports
- Maintain the connection between USER and GUARDIAN accounts
- Serve the scam-number delta feed consumed by devices

---

## Actor interaction summary

```
USER ──────────────── makes a call
                          │
                     CALL_ANALYZER ── assigns risk level
                          │
                     MOBILE_SUPPORT ── notifies USER (local)
                          │
                   (if HIGHEST level)
                          │
                     REMOTE_SUPPORT ── notifies GUARDIAN (FCM)
                          │
                       GUARDIAN ── intervenes / advises USER

USER / GUARDIAN ── submit scam report
                          │
                     REMOTE_SUPPORT ── stores as UNVERIFIED
                          │
                      MODERATOR ── verifies → VERIFIED / DISMISSED
                          │
                   (VERIFIED numbers flow back to devices via delta sync)
```
