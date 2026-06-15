# Analyzer

The Analyzer is the second layer of the Call Processor (2.1.1.2). It receives handoff from the Background service when the initial risk level is LOW, LOWER, MEDIUM, or HIGH, and progressively evaluates the call's audio content to refine the risk level.

---

## Input

The Analyzer is started by the Background service with:

| Field | Description |
|---|---|
| `callerHash` | SHA-256 of normalised E.164 caller number |
| `initialRiskLevel` | Risk level assigned by the Background service at RINGING |
| `callStartedAt` | Timestamp of ANSWERED event |

---

## Processing loop

The Analyzer runs two concurrent listeners for the duration of the active call: the **audio chunk loop** and the **SMS/message monitor**. Either can independently trigger a HIGH escalation.

```
ANSWERED
  └─ wait CALL_TRIGGER_LIMIT_SECONDS
       ├─ [Audio loop]
       │    loop:
       │      1. Capture PARAMETRIZED_CHUNK_LENGTH of audio
       │      2. Detect language
       │      3. Transcribe audio → text
       │      4. Classify transcript → { category, score, riskLevel }
       │      5. Emit result to Guardian service
       │      6. If riskLevel == HIGH or call ENDED → stop
       │         Else → continue loop
       │
       └─ [SMS/message monitor — runs in parallel]
              On each incoming message while call is active:
                1. Extract message body
                2. Run OTP/code detection (see below)
                3. If code detected → emit riskLevel=HIGH, category=SMS_CODE_REQUEST
                                    → stop both loops
                   Else → continue monitoring
```

**Parameters:**

| Parameter | Description |
|---|---|
| `CALL_TRIGGER_LIMIT_SECONDS` | Seconds after answer before first chunk is captured. Configurable. Default TBD. |
| `PARAMETRIZED_CHUNK_LENGTH` | Duration in seconds of each audio chunk fed to the classifier. Configurable. Default TBD. |

The risk level produced by the Analyzer can only increase. Once HIGH is emitted by either loop, both loops stop — the Background service and Guardian service take over.

---

## SMS/message monitor

While the audio loop is running, the Analyzer simultaneously monitors all incoming SMS and messaging notifications for code-extraction patterns. This covers the common scam vector where the caller keeps the victim on the phone while an SMS code arrives and then socially engineers them into reading it out.

### Detection signals

A message is flagged if it matches one or more of the following:

| Signal | Description |
|---|---|
| **Numeric OTP pattern** | Message body contains a standalone digit sequence of 4–8 digits (e.g. `123456`, `4729`, `83920174`) not embedded in a longer number |
| **OTP keyword** | Message contains keywords: `OTP`, `one-time`, `one time`, `verification code`, `cod de verificare`, `код подтверждения`, `authentication code`, `security code`, `access code`, `login code`, `sign-in code` |
| **Sender pattern** | Message sender is a short-code or alphanumeric sender ID (e.g. `BANK`, `AUTH`, `VERIFY`, 5-6 digit short codes) — raises suspicion weight, not a standalone trigger |
| **Code-request phrasing** | Message body contains phrases like `your code is`, `codul tău este`, `ваш код`, `do not share`, `nu distribuiți`, `не передавайте` |

A match on any **numeric OTP pattern** or **OTP keyword** signal alone is sufficient to trigger HIGH. Sender pattern alone is not.

### Output on detection

When a code is detected the monitor emits to the Guardian service immediately, bypassing the audio chunk loop:

| Field | Value |
|---|---|
| `riskLevel` | `HIGH` |
| `category` | `SMS_CODE_REQUEST` |
| `score` | `1.0` |
| `language` | `null` (message language not classified) |
| `transcriptSnippet` | `null` |
| `chunkIndex` | `-1` (sentinel — indicates SMS trigger, not audio chunk) |

### Open questions (SMS monitor)

| Question | Notes |
|---|---|
| Detection techniques beyond OTP (TBD) | Additional patterns to be defined as new scam vectors are observed |
| Minimum digit run length | 4 chosen as floor; needs tuning against false positives (e.g. dates, prices) |
| Multi-message threshold | Single matching message sufficient, or require N within a time window? |
| Access model | Requires notification listener permission on Android; define fallback if denied |

---

## Language support

The Analyzer detects language automatically before transcription. Supported languages:

| Language | Code |
|---|---|
| Romanian | `ro` |
| Russian | `ru` |

If the detected language is outside the supported set, the Analyzer continues with best-effort transcription and flags the result as `LANG_UNSUPPORTED`. This does not stop the loop.

Additional languages are added here as support is confirmed.

---

## Scam categories

The classifier identifies known scam patterns in the transcript. Categories are non-exhaustive — this list grows as new patterns are confirmed.

| Category | Description |
|---|---|
| `FAKE_DELIVERY` | Caller impersonates a courier or delivery service to extract personal or payment details |
| `FAKE_CREDIT` | Caller impersonates a bank or lender offering fake loans, credits, or financial products |
| `FAKE_TICKET` | Caller claims the USER has won a prize, lottery, or voucher requiring action to claim |
| `SMS_CODE_REQUEST` | Caller socially engineers the USER into reading out an OTP or SMS verification code |
| `UNKNOWN_SCAM` | Classifier indicates scam with high confidence but no specific category matched |

A call may trigger multiple categories across chunks. All matched categories are included in the output.

---

## Output — Guardian service emission

After each chunk evaluation the Analyzer emits to the **Guardian service**:

| Field | Description |
|---|---|
| `riskLevel` | Updated risk level for this chunk: `LOWER` / `LOW` / `MEDIUM` / `HIGH` |
| `category` | Matched scam category, or `null` if none |
| `score` | Classifier confidence score (0.0 – 1.0) |
| `language` | Detected language code, or `LANG_UNSUPPORTED` |
| `transcriptSnippet` | Short excerpt of the transcribed text (used by Guardian service for backend upload) |
| `chunkIndex` | Sequence number of this chunk within the call. `-1` indicates an SMS monitor trigger (not an audio chunk) |

The Guardian service acts on `riskLevel` changes. See [mobile.md](mobile.md) and the Guardian service contract for how each level is handled.

---

## Stop conditions

The Analyzer stops **both** the audio loop and the SMS monitor on any of the following:

- `riskLevel == HIGH` emitted by the audio loop — Guardian service takes over full escalation.
- `riskLevel == HIGH` emitted by the SMS monitor — same escalation path, category forced to `SMS_CODE_REQUEST`.
- `ENDED` event received from the Background service.
- USER explicitly dismisses the analysis (via Guardian service notification action).

---

## Open questions

| Question | Notes |
|---|---|
| `CALL_TRIGGER_LIMIT_SECONDS` default | Suggested range: 20–60s. Tune after data collection. |
| `PARAMETRIZED_CHUNK_LENGTH` default | Shorter = lower latency, higher compute cost. Suggested starting point: 10–15s. |
| Rolling average vs. single-chunk threshold | Single HIGH chunk sufficient, or require N consecutive chunks above threshold? |
| Multi-category handling | If multiple categories fire, does the highest-risk one govern escalation? |
| `LANG_UNSUPPORTED` escalation policy | Should an unrecognised language raise or lower confidence? |
