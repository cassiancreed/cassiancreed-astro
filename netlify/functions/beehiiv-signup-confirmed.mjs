import {
  WebhookVerificationError,
  createGaClient,
  processBeehiivRequest,
} from './lib/signup-attribution.mjs';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Deliberately unset in this scaffold. A process-local Map, filesystem file,
// or best-effort object write is not a transactional outbox. Replace this only
// after the adapter can atomically claim both dedupe keys and persist state.
function runtimeOutbox() {
  return null;
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  }

  const signingSecret = Netlify.env.get('BEEHIIV_WEBHOOK_SIGNING_SECRET');
  const measurementId = Netlify.env.get('GA4_MEASUREMENT_ID');
  const apiSecret = Netlify.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');
  const outbox = runtimeOutbox();

  if (!signingSecret || !measurementId || !apiSecret || !outbox) {
    return json(503, { ok: false, code: 'ATTRIBUTION_NOT_CONFIGURED' });
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 262_144) {
    return json(413, { ok: false, code: 'PAYLOAD_TOO_LARGE' });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 262_144) {
    return json(413, { ok: false, code: 'PAYLOAD_TOO_LARGE' });
  }
  const headers = {
    'svix-id': request.headers.get('svix-id'),
    'svix-timestamp': request.headers.get('svix-timestamp'),
    'svix-signature': request.headers.get('svix-signature'),
  };

  try {
    const result = await processBeehiivRequest({
      rawBody,
      headers,
      signingSecret,
      outbox,
      gaClient: createGaClient({ measurementId, apiSecret }),
    });
    return json(result.statusCode, { ok: result.statusCode === 200, outcome: result.outcome });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return json(401, { ok: false, code: 'INVALID_SIGNATURE' });
    }
    return json(503, { ok: false, code: 'PROCESSING_FAILED' });
  }
}

export const config = { path: '/api/beehiiv/subscription-confirmed' };
