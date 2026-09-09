import assert from 'node:assert/strict';
import test from 'node:test';
import { Webhook } from 'svix';
import {
  OUTBOX_STATES,
  WebhookVerificationError,
  processBeehiivRequest,
} from '../netlify/functions/lib/signup-attribution.mjs';

const SIGNING_SECRET = `whsec_${Buffer.from('nep-test-signing-secret-32-bytes!!').toString('base64')}`;

class MemoryOutbox {
  constructor() {
    this.keys = new Map();
    this.records = new Map();
    this.sequence = 0;
  }

  async claim({ dedupeKeys, record }) {
    if (dedupeKeys.some((key) => this.keys.has(key))) return { claimed: false };
    const id = `outbox-${++this.sequence}`;
    this.records.set(id, { ...record, id });
    dedupeKeys.forEach((key) => this.keys.set(key, id));
    return { claimed: true, id };
  }

  async mark(id, state, receipt) {
    const current = this.records.get(id);
    assert.ok(current, `unknown outbox id ${id}`);
    this.records.set(id, { ...current, state, receipt });
  }

  onlyRecord() {
    assert.equal(this.records.size, 1);
    return [...this.records.values()][0];
  }
}

function event(overrides = {}) {
  return {
    data: {
      created: Math.floor(Date.now() / 1000),
      email: 'not-forwarded@example.test',
      id: 'sub_00000000-0000-0000-0000-000000000001',
      status: 'active',
      utm_campaign: 'controlled-test',
      utm_channel: 'website',
      utm_medium: 'capture',
      utm_source: 'x',
      ...(overrides.data || {}),
    },
    event_timestamp: Math.floor(Date.now() / 1000),
    event_type: 'subscription.confirmed',
    uid: 'evt_00000000-0000-0000-0000-000000000001',
    ...overrides,
  };
}

function signed(input, messageId = 'msg_000000000000000000000001') {
  const rawBody = JSON.stringify(input);
  const timestamp = new Date();
  const signature = new Webhook(SIGNING_SECRET).sign(messageId, timestamp, rawBody);
  return {
    rawBody,
    headers: {
      'svix-id': messageId,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': signature,
    },
  };
}

function gaClient({ dispatchError = null } = {}) {
  const calls = { validate: 0, dispatch: 0, payloads: [] };
  return {
    calls,
    async validate(payload) {
      calls.validate += 1;
      calls.payloads.push(payload);
      return [];
    },
    async dispatch() {
      calls.dispatch += 1;
      if (dispatchError) throw dispatchError;
      return { status: 204 };
    },
  };
}

async function process(input, { outbox = new MemoryOutbox(), ga = gaClient(), messageId } = {}) {
  const request = signed(input, messageId);
  const result = await processBeehiivRequest({
    ...request,
    signingSecret: SIGNING_SECRET,
    outbox,
    gaClient: ga,
  });
  return { result, outbox, ga, request };
}

test('confirmed active subscription dispatches one validated sign_up without email', async () => {
  const { result, outbox, ga } = await process(event());
  assert.deepEqual(result, { statusCode: 200, outcome: 'DISPATCHED' });
  assert.equal(ga.calls.validate, 1);
  assert.equal(ga.calls.dispatch, 1);
  assert.equal(outbox.onlyRecord().state, OUTBOX_STATES.DISPATCHED);
  assert.equal(ga.calls.payloads[0].events[0].name, 'sign_up');
  assert.equal(JSON.stringify(ga.calls.payloads[0]).includes('not-forwarded@example.test'), false);
});

test('inactive subscription.confirmed event is ignored', async () => {
  const ga = gaClient();
  const { result } = await process(event({ data: { status: 'inactive' } }), { ga });
  assert.deepEqual(result, { statusCode: 200, outcome: 'IGNORED' });
  assert.equal(ga.calls.dispatch, 0);
});

test('non-confirmation event is ignored', async () => {
  const ga = gaClient();
  const { result } = await process(event({ event_type: 'subscription.created' }), { ga });
  assert.deepEqual(result, { statusCode: 200, outcome: 'IGNORED' });
  assert.equal(ga.calls.dispatch, 0);
});

test('invalid Svix signature is rejected before processing', async () => {
  const input = event();
  const request = signed(input);
  request.headers['svix-signature'] = 'v1,invalid';
  await assert.rejects(
    processBeehiivRequest({
      ...request,
      signingSecret: SIGNING_SECRET,
      outbox: new MemoryOutbox(),
      gaClient: gaClient(),
    }),
    WebhookVerificationError,
  );
});

test('repeat delivery of the same Beehiiv event does not redispatch', async () => {
  const outbox = new MemoryOutbox();
  const ga = gaClient();
  const input = event();
  const first = await process(input, { outbox, ga });
  const second = await process(input, { outbox, ga });
  assert.equal(first.result.outcome, 'DISPATCHED');
  assert.equal(second.result.outcome, 'DUPLICATE');
  assert.equal(ga.calls.dispatch, 1);
});

test('new event uid for an already confirmed subscription does not redispatch', async () => {
  const outbox = new MemoryOutbox();
  const ga = gaClient();
  await process(event(), { outbox, ga, messageId: 'msg_000000000000000000000001' });
  const second = event({ uid: 'evt_00000000-0000-0000-0000-000000000002' });
  const replay = await process(second, { outbox, ga, messageId: 'msg_000000000000000000000002' });
  assert.equal(replay.result.outcome, 'DUPLICATE');
  assert.equal(ga.calls.dispatch, 1);
});

test('ambiguous GA dispatch becomes UNKNOWN and is never auto-replayed', async () => {
  const outbox = new MemoryOutbox();
  const ga = gaClient({ dispatchError: new Error('connection reset after send') });
  const input = event();
  const first = await process(input, { outbox, ga });
  assert.deepEqual(first.result, { statusCode: 503, outcome: 'UNKNOWN' });
  assert.equal(outbox.onlyRecord().state, OUTBOX_STATES.UNKNOWN);

  const retry = await process(input, { outbox, ga });
  assert.equal(retry.result.outcome, 'DUPLICATE');
  assert.equal(ga.calls.dispatch, 1);
});
