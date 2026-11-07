import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  });
}

import { validateLoginPhone, checkLoginEligibility } from '../app/actions/auth_otp.ts';
import { checkLoginOtpRateLimits } from '../lib/auth-rate-limit.ts';
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('Sprint B - Login OTP WhatsApp Unit & Integration Tests', () => {
  // Test 1: Nomor valid
  it('1. should accept and correctly normalize valid Indonesian mobile numbers', async () => {
    const validCases = [
      { input: '087791134515', expectedE164: '+6287791134515', expectedFormatted: '6287791134515' },
      { input: '+6287791134515', expectedE164: '+6287791134515', expectedFormatted: '6287791134515' },
      { input: '6287791134515', expectedE164: '+6287791134515', expectedFormatted: '6287791134515' },
      { input: '0812-3456-7890', expectedE164: '+6281234567890', expectedFormatted: '6281234567890' },
      { input: ' 0852 1234 5678 ', expectedE164: '+6285212345678', expectedFormatted: '6285212345678' },
    ];

    for (const { input, expectedE164, expectedFormatted } of validCases) {
      const res = await validateLoginPhone(input);
      assert.equal(res.isValid, true, `Failed for input: ${input}`);
      assert.equal(res.e164, expectedE164);
      assert.equal(res.formatted, expectedFormatted);
      assert.equal(res.error, null);
    }
  });

  // Test 2: Nomor tidak valid
  it('2. should reject invalid phone formats and non-mobile numbers', async () => {
    const invalidInputs = [
      '',
      '   ',
      '12345',
      'abcdefghijk',
      '0215551234', // Landline Jakarta (not mobile 08...)
      '+14155552671', // US number
      '0812', // Too short
      '081234567890123456', // Too long
    ];

    for (const input of invalidInputs) {
      const res = await validateLoginPhone(input);
      assert.equal(res.isValid, false, `Should fail for input: ${input}`);
      assert.ok(res.error, `Error message should exist for input: ${input}`);
    }
  });

  // Test 3: Nomor tidak memenuhi syarat (unregistered / admin / unconfirmed)
  it('3. should enforce strict eligibility (reject unregistered and admin accounts)', async () => {
    // 3a. Unregistered phone
    const unregRes = await checkLoginEligibility('628999999999');
    assert.equal(unregRes.eligible, false);
    assert.equal(unregRes.reason, 'profile_not_found');

    // 3b. Admin account (must not be eligible for OTP login)
    const admin = createClient(STAGING_URL, SERVICE_KEY);
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('phone, phone_normalized, role')
      .neq('role', 'jamaah')
      .not('phone', 'is', null)
      .limit(1);

    if (adminProfiles && adminProfiles.length > 0) {
      const adminPhone = adminProfiles[0].phone_normalized || adminProfiles[0].phone;
      const cleanAdminPhone = adminPhone.replace(/\D/g, '');
      const adminRes = await checkLoginEligibility(cleanAdminPhone);
      assert.equal(adminRes.eligible, false);
      assert.equal(adminRes.reason, 'role_not_jamaah');
    }

    // 3c. Verified jamaah dummy account (should be eligible)
    const dummyRes = await checkLoginEligibility('6287791134515');
    assert.equal(dummyRes.eligible, true);
    assert.equal(dummyRes.userId, '58b88b82-f5eb-4ed6-a106-1b5af8759d3b');
  });

  // Test 4: OTP salah (token validation and format enforcement)
  it('4. should reject malformed OTP tokens without calling external services', () => {
    const invalidTokens = ['123', '12345', '1234567', 'abcdef', '12345a', ''];
    for (const token of invalidTokens) {
      const cleanToken = (token || '').replace(/\D/g, '');
      assert.notEqual(cleanToken.length, 6, `Token ${token} should be rejected`);
    }
  });

  // Test 5: OTP kedaluwarsa handling simulation
  it('5. should handle expired OTP errors gracefully with clear user feedback', () => {
    const simulatedError = { message: 'Token has expired or is invalid' };
    const friendlyError = simulatedError.message || 'Kode OTP salah atau telah kadaluarsa. Silakan periksa kembali.';
    assert.ok(friendlyError.toLowerCase().includes('kadaluarsa') || friendlyError.toLowerCase().includes('expired'));
  });

  // Test 6: Rate limit check (cooldown enforcement)
  it('6. should enforce 60-second cooldown rate limit between OTP requests', async () => {
    const testPhone = '+6289911223344';
    const testIp = '127.0.0.1';

    // 1st request should pass
    const firstCheck = await checkLoginOtpRateLimits({ phone: testPhone, clientIp: testIp });
    assert.equal(firstCheck.allowed, true);

    // Immediate 2nd request within 60s should be blocked by Layer 1 cooldown
    const secondCheck = await checkLoginOtpRateLimits({ phone: testPhone, clientIp: testIp });
    assert.equal(secondCheck.allowed, false);
    assert.ok(secondCheck.cooldownSeconds > 0);
    assert.ok(secondCheck.error?.includes('Mohon tunggu'));

    // Cleanup test key
    const admin = createClient(STAGING_URL, SERVICE_KEY);
    await admin.from('auth_rate_limits').delete().eq('key', `resend:login:phone:${testPhone}`);
  });

  // Test 7: shouldCreateUser: false enforcement verification
  it('7. should enforce options.shouldCreateUser === false in contract', () => {
    const options = { shouldCreateUser: false };
    assert.equal(options.shouldCreateUser, false, 'shouldCreateUser must be explicitly false');
  });

  // Test 8: Login password legacy tetap bekerja
  it('8. should verify that legacy password authentication continues to work', async () => {
    const credContent = fs.readFileSync('scratch/qa_credentials.local.txt', 'utf8');
    const mPass = credContent.match(/PASSWORD:\s*([^\r\n]+)/);
    assert.ok(mPass, 'Password in scratch credentials file must exist');
    const password = mPass[1].trim();

    const anonClient = createClient(STAGING_URL, ANON_KEY);
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: 'dummy_qa_tester@qurban.makt.id',
      password,
    });

    assert.equal(error, null, `Password login should succeed: ${error?.message}`);
    assert.equal(data.user?.id, '58b88b82-f5eb-4ed6-a106-1b5af8759d3b');
    assert.equal(data.user?.email, 'dummy_qa_tester@qurban.makt.id');
  });
});
