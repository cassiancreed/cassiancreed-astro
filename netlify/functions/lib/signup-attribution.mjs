import { createHash } from 'node:crypto';
import { Webhook } from 'svix';

export const OUTBOX_STATES = Object.freeze({
  PENDING: 'PENDING',
  DISPATCHED: 'DISPATCHED',
  CONFIRMED_OBSERVED: 'CONFIRMED_OBSERVED',
  UNKNOWN: 'UNKNOWN',
});

export class WebhookVerificationError extends Error {
  constructor(message = 'Webhook signature verification failed') {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Missing required webhook field: ${field}`);
  }
  return value.trim();
}

function analyticsParam(value) {
  if (typeof value !== 'string') return '(not_set)';
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return clean ? clean.slice(0, 100) : '(not_set)';
}

function documentedAcquisition(data) {
  return {
    source: analyticsParam(data.utm_source),
    medium: analyticsParam(data.utm_medium),
    campaign: analyticsParam(data.utm_campaign),
    channel: analyticsParam(data.utm_channel),
  };
}

function analyticsIdentity(subscriptionId, timestamp) {
  const digest = createHash('sha256').update(subscriptionId).digest();
  const first = digest.readUInt32BE(0) || 1;
  const second = digest.readUInt32BE(4) || Number(timestamp) || 1;
  return {
    clientId: `${first}.${second}`,
    subscriptionHash: digest.toString('hex').slice(0, 24),
  };
}

export function buildMeasurementPayload(event) {
  const subscriptionId = requireString(event?.data?.id, 'data.id');
  const eventUid = requireString(event?.uid, 'uid');
  const eventTimestamp = Number(event?.event_timestamp);
  const occurredAt = Number.isFinite(eventTimestamp) && eventTimestamp > 0
    ? Math.floor(eventTimestamp)
    : Math.floor(Date.now() / 1000);
  const acquisition = documentedAcquisition(event.data);
  const identity = analyticsIdentity(subscriptionId, occurredAt);

  return {
    client_id: identity.clientId,
    timestamp_micros: occurredAt * 1_000_000,
    events: [{
      name: 'sign_up',
      params: {
        method: 'beehiiv',
        engagement_time_msec: 1,
        session_id: occurredAt,
        event_id: eventUid,
        source_subscription_hash: identity.subscriptionHash,
        acquisition_source: acquisition.source,
        acquisition_medium: acquisition.medium,
        acquisition_campaign: acquisition.campaign,
        acquisition_channel: acquisition.channel,
      },
    }],
  };
}

export function verifyBeehiivWebhook({ rawBody, headers, signingSecret }) {
  if (typeof rawBody !== 'string') {
    throw new TypeError('rawBody must be the untouched request text');
  }
  requireString(signingSecret, 'signingSecret');

  try {
    return new Webhook(signingSecret).verify(rawBody, {
      'svix-id': headers?.['svix-id'],
      'svix-timestamp': headers?.['svix-timestamp'],
      'svix-signature': headers?.['svix-signature'],
    });
  } catch {
    throw new WebhookVerificationError();
  }
}

export function createGaClient({ measurementId, apiSecret, fetchImpl = fetch }) {
  requireString(measurementId, 'measurementId');
  requireString(apiSecret, 'apiSecret');

  const query = new URLSearchParams({
    measurement_id: measurementId,
    api_secret: apiSecret,
  });

  async function post(baseUrl, payload) {
    const response = await fetchImpl(`${baseUrl}?${query}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`GA4 Measurement Protocol returned HTTP ${response.status}`);
    }
    return response;
  }

  return {
    async validate(payload) {
      const response = await post(
        'https://www.google-analytics.com/debug/mp/collect',
        { ...payload, validation_behavior: 'ENFORCE_RECOMMENDATIONS' },
      );
      const body = await response.json();
      return Array.isArray(body?.validationMessages) ? body.validationMessages : [];
    },
    async dispatch(payload) {
      const response = await post(
        'https://www.google-analytics.com/mp/collect',
        payload,
      );
      return { status: response.status };
    },
  };
}

function assertOutbox(outbox) {
  if (!outbox || typeof outbox.claim !== 'function' || typeof outbox.mark !== 'function') {
    throw new TypeError('A durable transactional outbox adapter is required');
  }
}

function targetEvent(event) {
  return event?.event_type === 'subscription.confirmed' && event?.data?.status === 'active';
}

export async function processVerifiedSubscription({ event, outbox, gaClient }) {
  if (!targetEvent(event)) {
    return { statusCode: 200, outcome: 'IGNORED' };
  }

  assertOutbox(outbox);
  if (!gaClient || typeof gaClient.validate !== 'function' || typeof gaClient.dispatch !== 'function') {
    throw new TypeError('A GA4 Measurement Protocol client is required');
  }

  const eventUid = requireString(event.uid, 'uid');
  const subscriptionId = requireString(event.data.id, 'data.id');
  const dedupeKeys = [
    `beehiiv-event:${eventUid}`,
    `subscription.confirmed:${subscriptionId}`,
  ];
  const payload = buildMeasurementPayload(event);
  const claimed = await outbox.claim({
    dedupeKeys,
    record: {
      source: 'beehiiv',
      sourceEvent: 'subscription.confirmed',
      sourceEventUid: eventUid,
      sourceSubscriptionId: subscriptionId,
      state: OUTBOX_STATES.PENDING,
      payload,
    },
  });

  if (!claimed?.claimed) {
    return { statusCode: 200, outcome: 'DUPLICATE' };
  }

  const outboxId = claimed.id;
  try {
    const validationMessages = await gaClient.validate(payload);
    if (validationMessages.length > 0) {
      await outbox.mark(outboxId, OUTBOX_STATES.UNKNOWN, {
        reason: 'GA4_VALIDATION_MESSAGES',
        validationMessages,
      });
      return { statusCode: 503, outcome: 'UNKNOWN' };
    }

    // UNKNOWN is the safe pre-send state: if the process dies after GA accepts
    // the request, a later delivery must pause instead of sending it again.
    await outbox.mark(outboxId, OUTBOX_STATES.UNKNOWN, {
      reason: 'GA4_DISPATCH_IN_FLIGHT',
    });
    const dispatchReceipt = await gaClient.dispatch(payload);
    await outbox.mark(outboxId, OUTBOX_STATES.DISPATCHED, {
      dispatchReceipt,
      dispatchedAt: new Date().toISOString(),
    });
    return { statusCode: 200, outcome: 'DISPATCHED' };
  } catch (error) {
    await outbox.mark(outboxId, OUTBOX_STATES.UNKNOWN, {
      reason: 'GA4_DISPATCH_AMBIGUOUS',
      errorName: error?.name || 'Error',
    });
    return { statusCode: 503, outcome: 'UNKNOWN' };
  }
}

export async function processBeehiivRequest({ rawBody, headers, signingSecret, outbox, gaClient }) {
  const event = verifyBeehiivWebhook({ rawBody, headers, signingSecret });
  return processVerifiedSubscription({ event, outbox, gaClient });
}
