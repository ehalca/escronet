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

The Analyzer runs a continuous chunk-evaluation loop for the duration of the active call.

```
ANSWERED
  └─ wait CALL_TRIGGER_LIMIT_SECONDS
       └─ loop:
            1. Capture PARAMETRIZED_CHUNK_LENGTH of audio
            2. Detect language
            3. Transcribe audio → text
            4. Classify transcript → { category, score, riskLevel }
            5. Emit result to Guardian service
            6. If riskLevel == HIGH or call ENDED → stop
               Else → continue loop
```

**Parameters:**

| Parameter | Description |
|---|---|
| `CALL_TRIGGER_LIMIT_SECONDS` | Seconds after answer before first chunk is captured. Configurable. Default TBD. |
| `PARAMETRIZED_CHUNK_LENGTH` | Duration in seconds of each audio chunk fed to the classifier. Configurable. Default TBD. |

The risk level produced by the Analyzer can only increase. Once HIGH is emitted, the loop stops — the Background service and Guardian service take over.

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
| `chunkIndex` | Sequence number of this chunk within the call |

The Guardian service acts on `riskLevel` changes. See [mobile.md](mobile.md) and the Guardian service contract for how each level is handled.

---

## Stop conditions

The Analyzer stops the loop on any of the following:

- `riskLevel == HIGH` emitted — Guardian service takes over full escalation.
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
