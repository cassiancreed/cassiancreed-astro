# Beehiiv → GA4 confirmed-signup attribution

Status: **scaffold only; fail-closed; do not configure Beehiiv yet**.

The current browser redirects and thank-you page show useful interface state,
but they do not prove that Beehiiv has confirmed an active subscriber. This
change makes a signed Beehiiv `subscription.confirmed` event with
`data.status === "active"` the sole source of GA4 `sign_up`.

## Security and delivery contract

- Verify the untouched request body with the official `svix` verifier and the
  `svix-id`, `svix-timestamp`, and `svix-signature` headers.
- Never log or forward subscriber email. The GA payload uses a one-way hash of
  the Beehiiv subscription ID.
- Atomically claim both `beehiiv-event:${uid}` and
  `subscription.confirmed:${data.id}` in a durable transaction.
- Record `PENDING`, `DISPATCHED`, `CONFIRMED_OBSERVED`, or `UNKNOWN`.
- Never auto-replay `UNKNOWN`: the original request may have reached GA even
  when its HTTP receipt was lost.
- Validate each fixed payload through `/debug/mp/collect` with no validation
  messages before dispatch. A Measurement Protocol 2xx proves receipt only,
  not ingestion or reporting.
- Set `CONFIRMED_OBSERVED` only after the controlled event is seen exactly once
  in GA Realtime/DebugView.

The webhook does not contain the visitor's browser GA `client_id`. The scaffold
therefore uses a stable synthetic ID. That can repair confirmed-signup counts
and carry Beehiiv's documented UTM fields, but it cannot join the conversion to
the original browser session and may add a GA new user. It does **not** by
itself repair the site's returning-user measurement.

## Why the endpoint returns 503

`netlify/functions/beehiiv-signup-confirmed.mjs` deliberately has no runtime
outbox adapter. A process-local map, temporary file, or non-transactional
object write cannot enforce both dedupe keys. Until a reviewed durable adapter
is wired and the three secrets are configured, the endpoint returns
`ATTRIBUTION_NOT_CONFIGURED` and sends no GA event.

Required environment variables after approval:

- `BEEHIIV_WEBHOOK_SIGNING_SECRET`
- `GA4_MEASUREMENT_ID`
- `GA4_MEASUREMENT_PROTOCOL_SECRET`

## Acceptance sequence

1. Review and implement the durable adapter from `signup-outbox.sql`.
2. Run `npm run signup-webhook:test` and `npm run build`.
3. Configure secrets in the preview context only.
4. Register the preview webhook only after the endpoint is no longer
   fail-closed.
5. Submit one uniquely tagged test address, complete confirmation, and retain
   the Beehiiv event ID, outbox row, GA validation receipt, and GA observation.
6. Replay the same signed delivery and reload the redirect; the GA count must
   remain one.

References:

- https://developers.beehiiv.com/webhooks
- https://developers.beehiiv.com/webhooks/subscription/confirmed
- https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
