-- Reference contract for the durable subscriber-attribution outbox.
-- The runtime endpoint remains disabled until a reviewed adapter implements
-- this transaction against a durable database.

CREATE TABLE signup_attribution_outbox (
  id UUID PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN (
    'PENDING', 'DISPATCHED', 'CONFIRMED_OBSERVED', 'UNKNOWN'
  )),
  source TEXT NOT NULL,
  source_event TEXT NOT NULL,
  source_event_uid TEXT NOT NULL,
  source_subscription_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE signup_attribution_dedupe (
  dedupe_key TEXT PRIMARY KEY,
  outbox_id UUID NOT NULL REFERENCES signup_attribution_outbox(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- claim(record, [event_key, subscription_key]) MUST execute in one transaction:
--   BEGIN;
--   INSERT INTO signup_attribution_outbox (... state='PENDING' ...);
--   INSERT INTO signup_attribution_dedupe (dedupe_key, outbox_id)
--     VALUES (:event_key, :id), (:subscription_key, :id);
--   COMMIT;
-- Any unique-key conflict MUST roll back the outbox insert and return duplicate.
-- UNKNOWN rows are manual-review only and MUST NOT be replayed automatically.
