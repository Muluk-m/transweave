# Webhook Events

Transweave delivers webhook events to URLs registered per project. This document
covers event types, payload shape, signature verification, and example receiver
code.

## Configuring webhooks

Webhooks are scoped to a single project. Each webhook has:

| Field | Type | Notes |
|-------|------|-------|
| `url` | string | HTTPS endpoint to receive POST requests |
| `secret` | string | Used to compute HMAC-SHA256 signatures |
| `events` | string[] | Events to subscribe to (see below) |
| `active` | boolean | Toggle delivery without removing the webhook |

Internal addresses (`localhost`, RFC 1918 ranges, etc.) are blocked by SSRF
protection — webhooks must point at a publicly reachable URL.

## Event types

| Event | Fires when |
|-------|------------|
| `token.created` | A token is created via API/UI/CLI/MCP |
| `token.updated` | Non-translation fields change (key, module, tags, comment, screenshots) |
| `token.translated` | A token's `translations` map is mutated (single-token API path) |
| `token.deleted` | A token is deleted |
| `token.status_changed` | At least one language's status transitions to a different value |
| `tokens.batch_completed` | A batch operation finishes — emitted **once** per batch instead of N per-token events. `mode` distinguishes the operation. |
| `project.exported` | (Reserved) A project is exported |
| `project.imported` | (Reserved) Translations are imported into a project |

### Payload envelope

Every delivery sends:

```json
{
  "event": "<event name>",
  "payload": { /* event-specific shape */ },
  "timestamp": 1714348800000
}
```

`timestamp` is Unix epoch in milliseconds (server clock).

### Example payloads

#### `token.created`

```json
{
  "projectId": "01HRBV…",
  "tokenId": "01HRBV…",
  "key": "user.profile.title",
  "module": "user",
  "actorId": "01HRBV…",
  "occurredAt": "2026-05-08T10:00:00.000Z"
}
```

#### `token.updated` / `token.translated`

```json
{
  "projectId": "…",
  "tokenId": "…",
  "key": "user.profile.title",
  "module": "user",
  "changedFields": ["translations", "comment"],
  "languagesUpdated": ["zh-CN"],
  "actorId": "…",
  "occurredAt": "2026-05-08T10:00:00.000Z"
}
```

`token.translated` fires whenever `translations` is part of the change set;
otherwise the same payload arrives as `token.updated`.

#### `token.status_changed`

```json
{
  "projectId": "…",
  "tokenId": "…",
  "key": "user.profile.title",
  "module": "user",
  "transitions": [
    { "language": "zh-CN", "fromStatus": "translated", "toStatus": "approved" },
    { "language": "ja-JP", "fromStatus": null, "toStatus": "draft" }
  ],
  "actorId": "…",
  "occurredAt": "2026-05-08T10:00:00.000Z"
}
```

#### `tokens.batch_completed`

```json
{
  "projectId": "…",
  "mode": "set-status",
  "count": 100,
  "languages": ["zh-CN", "en-US"],
  "status": "approved",
  "actorId": "…",
  "occurredAt": "2026-05-08T10:00:00.000Z"
}
```

`mode` values currently emitted:
`set-status` · `set-tags` · `set-module` · `delete`. Future modes
(`translate`, `import`) will follow the same envelope; subscribers that don't
recognise a `mode` should ignore the event.

## Headers

Every delivery carries:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Transweave-Event` | event name (e.g. `token.created`) |
| `X-Transweave-Signature` | `sha256=<hex>` HMAC-SHA256 of the raw body using the webhook's `secret` |
| `X-Webhook-Event` / `X-Webhook-Signature` | (legacy aliases — same values; will be removed in a future major version) |

Failures and timeouts are logged on the server but never bubble back into the
originating API call. There is currently no automatic retry — consumers should
be idempotent on `tokenId` + `event` + `occurredAt`.

## Verifying the signature

Always verify the signature with a constant-time comparison.

### Node.js

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyTransweaveSignature(rawBody, header, secret) {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = header.slice('sha256='.length);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
```

### Python

```python
import hmac, hashlib

def verify_transweave_signature(raw_body: bytes, header: str, secret: str) -> bool:
    if not header.startswith("sha256="):
        return False
    mac = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, header.split("=", 1)[1])
```

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "strings"
)

func VerifyTransweaveSignature(rawBody []byte, header, secret string) bool {
    if !strings.HasPrefix(header, "sha256=") {
        return false
    }
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(rawBody)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(strings.TrimPrefix(header, "sha256=")))
}
```

## Failure semantics

* Non-2xx responses are logged on the Transweave server with the webhook id
  and HTTP status. The originating API call still succeeds.
* Network errors / 10s timeout abort delivery silently from the caller's view.
* Automatic retry is **not** implemented in this release — track follow-up in
  `TODOS.md`.
