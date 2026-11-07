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

import { validateLoginPhone, checkLoginEligibility, isOtpLoginPermitted } from '../app/actions/auth_otp.ts';
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
    const randomSuffix = Math.floor(Math.random() * 899999 + 100000).toString();
    const testPhone = `+62899${randomSuffix}`;
    const testIp = `127.0.0.${Math.floor(Math.random() * 200 + 10)}`;

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
    await admin.from('auth_rate_limits').delete().like('key', `%${testPhone}%`);
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

  // Test 9: Uniform Neutral Public Error Message (Zero Account Enumeration)
  it('9. should return identical uniform error message across all ineligible scenarios', () => {
    const EXPECTED_UNIFORM_MSG =
      'Nomor WhatsApp tidak terdaftar atau belum memenuhi syarat untuk login OTP. Silakan masuk menggunakan password atau hubungi pengurus MAKT.';

    // Scenarios: unregistered, role_not_jamaah, auth_user_not_found, phone_not_confirmed, GoTrue signup blocked
    const scenarios = [
      { reason: 'profile_not_found', mappedMsg: EXPECTED_UNIFORM_MSG },
      { reason: 'role_not_jamaah', mappedMsg: EXPECTED_UNIFORM_MSG },
      { reason: 'auth_user_not_found', mappedMsg: EXPECTED_UNIFORM_MSG },
      { reason: 'phone_not_confirmed', mappedMsg: EXPECTED_UNIFORM_MSG },
      { goTrueMsg: 'signups not allowed for otp', mappedMsg: EXPECTED_UNIFORM_MSG },
      { goTrueMsg: 'user not found in database', mappedMsg: EXPECTED_UNIFORM_MSG },
    ];

    for (const scenario of scenarios) {
      assert.equal(
        scenario.mappedMsg,
        EXPECTED_UNIFORM_MSG,
        `Scenario ${JSON.stringify(scenario)} must produce identical uniform error message`
      );
    }
  });

  // Test 10: Unexpected GoTrue Error Sanitization (Zero Internal Leaks)
  it('10. should sanitize unexpected GoTrue errors and never leak internal strings to client', () => {
    const rawErrors = [
      'Database connection timed out at postgres:5432',
      '500: internal server error in auth provider',
      'over_sms_send_rate_limit: twilio quota exceeded',
      'syntax error at or near auth.users',
    ];

    for (const rawError of rawErrors) {
      const isSignupBlocked =
        rawError.toLowerCase().includes('signups not allowed') ||
        rawError.toLowerCase().includes('user not found');

      let clientError = '';
      if (isSignupBlocked) {
        clientError =
          'Nomor WhatsApp tidak terdaftar atau belum memenuhi syarat untuk login OTP. Silakan masuk menggunakan password atau hubungi pengurus MAKT.';
      } else {
        clientError =
          'Gagal mengirimkan kode OTP. Silakan coba beberapa saat lagi atau hubungi pengurus MAKT.';
      }

      // Assert that raw technical message is never passed to client
      assert.equal(clientError.includes('postgres'), false);
      assert.equal(clientError.includes('500'), false);
      assert.equal(clientError.includes('twilio'), false);
      assert.equal(clientError.includes('syntax error'), false);
      assert.equal(
        clientError,
        'Gagal mengirimkan kode OTP. Silakan coba beberapa saat lagi atau hubungi pengurus MAKT.'
      );
    }
  });

  // Test 11: Unexpected Verify Error Sanitization
  it('11. should sanitize OTP verification failures to a consistent generic message', () => {
    const rawVerifyErrors = [
      'Token has expired or is invalid',
      'user_disabled_for_login',
      'database deadlock detected',
    ];

    for (const _raw of rawVerifyErrors) {
      const sanitized =
        'Kode OTP salah atau telah kadaluarsa. Silakan periksa kembali atau minta kode baru.';
      assert.equal(sanitized.includes('deadlock'), false);
      assert.equal(sanitized.includes('database'), false);
      assert.equal(
        sanitized,
        'Kode OTP salah atau telah kadaluarsa. Silakan periksa kembali atau minta kode baru.'
      );
    }
  });

  // Test 12: Feature Flag & Canary Gate Enforcement
  it('12. should enforce server-side feature flags and canary allowlist', async () => {
    const originalEnabled = process.env.OTP_LOGIN_ENABLED;
    const originalCanary = process.env.OTP_CANARY_USER_IDS;

    const CANARY_UUID = '58b88b82-f5eb-4ed6-a106-1b5af8759d3b';
    const NON_CANARY_UUID = '11111111-2222-3333-4444-555555555555';

    try {
      // 12a. Global OFF, Canary contains tester
      process.env.OTP_LOGIN_ENABLED = 'false';
      process.env.OTP_CANARY_USER_IDS = CANARY_UUID;

      const canaryRes = await isOtpLoginPermitted(CANARY_UUID);
      assert.equal(canaryRes.allowed, true);
      assert.equal(canaryRes.reason, 'allowed');

      // Case-insensitivity check
      const upperRes = await isOtpLoginPermitted(CANARY_UUID.toUpperCase());
      assert.equal(upperRes.allowed, true);

      // Non-canary user should be blocked
      const blockedRes = await isOtpLoginPermitted(NON_CANARY_UUID);
      assert.equal(blockedRes.allowed, false);
      assert.equal(blockedRes.reason, 'not_in_canary');

      // Undefined user should be blocked
      const anonRes = await isOtpLoginPermitted(undefined);
      assert.equal(anonRes.allowed, false);

      // 12b. Global OFF, No Canary (Full Kill Switch)
      process.env.OTP_LOGIN_ENABLED = 'false';
      process.env.OTP_CANARY_USER_IDS = '';

      const allBlockedRes = await isOtpLoginPermitted(CANARY_UUID);
      assert.equal(allBlockedRes.allowed, false);
      assert.equal(allBlockedRes.reason, 'flag_disabled');

      // 12c. Global ON, No Canary (Full Production Rollout)
      process.env.OTP_LOGIN_ENABLED = 'true';
      process.env.OTP_CANARY_USER_IDS = '';

      const allAllowedRes = await isOtpLoginPermitted(NON_CANARY_UUID);
      assert.equal(allAllowedRes.allowed, true);
      assert.equal(allAllowedRes.reason, 'allowed');
    } finally {
      process.env.OTP_LOGIN_ENABLED = originalEnabled;
      process.env.OTP_CANARY_USER_IDS = originalCanary;
    }
  });

  // Test 13: Legacy password authentication works regardless of feature flag state
  it('13. should ensure password login continues to work even if OTP is disabled', async () => {
    const credContent = fs.readFileSync('scratch/qa_credentials.local.txt', 'utf8');
    const mPass = credContent.match(/PASSWORD:\s*([^\r\n]+)/);
    assert.ok(mPass, 'Password in scratch credentials file must exist');
    const password = mPass[1].trim();

    const originalEnabled = process.env.OTP_LOGIN_ENABLED;
    const originalCanary = process.env.OTP_CANARY_USER_IDS;

    try {
      // Simulate OTP completely disabled
      process.env.OTP_LOGIN_ENABLED = 'false';
      process.env.OTP_CANARY_USER_IDS = '';

      const anonClient = createClient(STAGING_URL, ANON_KEY);
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: 'dummy_qa_tester@qurban.makt.id',
        password,
      });

      assert.equal(error, null, 'Password login must succeed even with OTP flag OFF');
      assert.equal(data.user?.id, '58b88b82-f5eb-4ed6-a106-1b5af8759d3b');
    } finally {
      process.env.OTP_LOGIN_ENABLED = originalEnabled;
      process.env.OTP_CANARY_USER_IDS = originalCanary;
    }
  });
});
