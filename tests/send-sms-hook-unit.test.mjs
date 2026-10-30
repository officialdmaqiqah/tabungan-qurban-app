import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { Webhook } from 'standardwebhooks';
import { NextRequest } from 'next/server';

// Load .env.local to have database connection for claimWebhook
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  });
}

import { POST } from '../app/api/auth/send-sms-hook/route.ts';

// Test secret for standardwebhooks HMAC verification
const TEST_SECRET = 'whsec_MfKQ9r8GKYqrTwjmtUStU5fcYAgyi4G+bzMTd4LE6mg=';
const wh = new Webhook(TEST_SECRET);

describe('Send SMS Hook - Unit Tests', () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.SUPABASE_AUTH_HOOK_SECRET = TEST_SECRET;
    process.env.WA_DRY_RUN = 'true';
    process.env.XSENDER_API_KEY = 'test_key';
    process.env.XSENDER_DEVICE_ID = 'test_device';
  });

  after(() => {
    process.env = originalEnv;
  });

  function createSignedRequest(payloadObj, customSecret = null, customHeaders = {}) {
    const rawBody = JSON.stringify(payloadObj);
    const msgId = 'msg_test_' + Math.random().toString(36).slice(2);
    const timestamp = new Date();
    const signer = customSecret ? new Webhook(customSecret) : wh;
    const signature = signer.sign(msgId, timestamp, rawBody);

    const headers = new Headers({
      'Content-Type': 'application/json',
      'webhook-id': msgId,
      'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'webhook-signature': signature,
      ...customHeaders,
    });

    return new NextRequest('http://localhost:3000/api/auth/send-sms-hook', {
      method: 'POST',
      headers,
      body: rawBody,
    });
  }

  it('1. should succeed when user.phone is provided (existing phone)', async () => {
    const req = createSignedRequest({
      user: { id: 'u1', phone: '+6281234567890' },
      sms: { otp: '123456' },
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it('2. should succeed when user.phone_change is provided (new phone linking)', async () => {
    const req = createSignedRequest({
      user: { id: 'u2', phone_change: '087791134515' },
      sms: { otp: '654321' },
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it('3. should return 400 when phone number is invalid format', async () => {
    const req = createSignedRequest({
      user: { id: 'u3', phone_change: '12345' }, // Too short / not Indonesian mobile
      sms: { otp: '123456' },
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid Indonesian mobile phone number format');
  });

  it('4. should return 400 when OTP is missing', async () => {
    const req = createSignedRequest({
      user: { id: 'u4', phone: '+6281234567890' },
      sms: {}, // missing otp
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Missing phone number or OTP code in payload');
  });

  it('5. should return 401 when signature is invalid (wrong secret)', async () => {
    const WRONG_SECRET = 'whsec_9999999999999999999999999999999999999999998=';
    const req = createSignedRequest(
      {
        user: { id: 'u5', phone: '+6281234567890' },
        sms: { otp: '123456' },
      },
      WRONG_SECRET
    );

    const res = await POST(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized: Webhook verification failed/);
  });
});
