'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatE164 } from '@/lib/utils';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { checkLoginOtpRateLimits } from '@/lib/auth-rate-limit';

export interface LoginOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  cooldownSeconds?: number;
  redirectUrl?: string;
}

/**
 * Securely extract client IP, prioritizing Vercel trusted edge headers
 * to prevent IP spoofing attacks via manipulated X-Forwarded-For headers.
 */
function getClientIp(headerList: Headers): string {
  // On Vercel, 'x-real-ip' is populated by the edge gateway directly from the TCP socket
  // and cannot be spoofed by incoming client headers.
  const realIp = headerList.get('x-real-ip');
  if (realIp) return realIp.trim();

  const vercelIp = headerList.get('x-vercel-ip');
  if (vercelIp) return vercelIp.trim();

  // Fallback to x-forwarded-for if present
  const xff = headerList.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  return '127.0.0.1';
}

/**
 * Pure helper to validate phone format for login OTP
 */
export async function validateLoginPhone(phoneInput: string): Promise<{
  isValid: boolean;
  e164: string | null;
  formatted: string | null;
  error: string | null;
}> {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return { isValid: false, e164: null, formatted: null, error: 'Nomor WhatsApp wajib diisi.' };
  }

  const { e164, formatted, error } = formatE164(phoneInput);
  if (error || !e164 || !formatted) {
    return {
      isValid: false,
      e164: null,
      formatted: null,
      error: error || 'Format nomor WhatsApp tidak valid. Gunakan format 08... atau +628...',
    };
  }

  return { isValid: true, e164, formatted, error: null };
}

/**
 * Server-side eligibility gate:
 * 1. Checks if profile exists and role is strictly 'jamaah'
 * 2. Checks if Auth user exists and has confirmed phone (phone_confirmed_at != null)
 * 3. Never leaks detailed internal status to caller (caller maps to neutral error)
 */
export async function checkLoginEligibility(formattedPhone: string): Promise<{
  eligible: boolean;
  userId?: string;
  reason?: 'profile_not_found' | 'role_not_jamaah' | 'auth_user_not_found' | 'phone_not_confirmed';
}> {
  try {
    const admin = createAdminClient();

    // 1. Profile check by phone or phone_normalized
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, role, phone_normalized')
      .or(`phone_normalized.eq.${formattedPhone},phone.eq.${formattedPhone}`)
      .maybeSingle();

    if (profErr || !profile) {
      return { eligible: false, reason: 'profile_not_found' };
    }

    // Role gate: Only jamaah can use login OTP (admins must use legacy password)
    if (profile.role !== 'jamaah') {
      return { eligible: false, reason: 'role_not_jamaah' };
    }

    // 2. Auth user check: Ensure phone_confirmed_at exists
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.id);
    if (authErr || !authUser?.user) {
      return { eligible: false, reason: 'auth_user_not_found' };
    }

    if (!authUser.user.phone_confirmed_at) {
      return { eligible: false, reason: 'phone_not_confirmed' };
    }

    return { eligible: true, userId: profile.id };
  } catch {
    // Fail-closed
    return { eligible: false, reason: 'auth_user_not_found' };
  }
}

/**
 * Server-side Feature Flag & Canary Gate for Login OTP:
 * - OTP_LOGIN_ENABLED='false' as default
 * - OTP_CANARY_USER_IDS: Comma-separated list of approved tester UUIDs
 */
export async function isOtpLoginPermitted(userId?: string): Promise<{
  allowed: boolean;
  reason: 'allowed' | 'flag_disabled' | 'not_in_canary';
}> {
  const isGlobalEnabled = process.env.OTP_LOGIN_ENABLED === 'true';
  const canaryListRaw = process.env.OTP_CANARY_USER_IDS || '';
  const canaryIds = canaryListRaw
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);

  // If user UUID is explicitly in the canary allowlist, allow them
  if (userId && canaryIds.includes(userId.toLowerCase())) {
    return { allowed: true, reason: 'allowed' };
  }

  // If global flag is ON and no canary restriction is defined (or wildcard '*'), allow all
  if (isGlobalEnabled && (canaryIds.length === 0 || canaryIds.includes('*'))) {
    return { allowed: true, reason: 'allowed' };
  }

  // Otherwise blocked (canary not matched or feature disabled)
  return {
    allowed: false,
    reason: canaryIds.length > 0 ? 'not_in_canary' : 'flag_disabled',
  };
}

/**
 * Step 1: Request WhatsApp OTP for Login
 * - Strict input validation
 * - Distributed multi-layer rate limiting
 * - Server-side eligibility check
 * - Supabase signInWithOtp({ phone, options: { shouldCreateUser: false } })
 * - Neutral error messages (Zero account enumeration)
 */
export async function requestLoginOtp(phoneInput: string): Promise<LoginOtpResponse> {
  try {
    // 1. Input Validation
    const validation = await validateLoginPhone(phoneInput);
    if (!validation.isValid || !validation.e164 || !validation.formatted) {
      return {
        success: false,
        error: validation.error || 'Format nomor WhatsApp tidak valid.',
      };
    }

    const { e164, formatted } = validation;

    // 2. Extract Trusted Client IP (Spoofing-resistant)
    const headerList = await headers();
    const clientIp = getClientIp(headerList);

    // 3. Multi-layer Rate Limiting
    const rateCheck = await checkLoginOtpRateLimits({
      phone: e164,
      clientIp,
    });

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.error || 'Batas pengiriman OTP tercapai. Mohon tunggu sejenak.',
        cooldownSeconds: rateCheck.cooldownSeconds,
      };
    }

    // 4. Server-Side Eligibility Check (Fail-closed & Neutral Error)
    const eligibility = await checkLoginEligibility(formatted);
    if (!eligibility.eligible) {
      // Uniform neutral error message to prevent account enumeration
      return {
        success: false,
        error:
          'Nomor WhatsApp tidak terdaftar atau belum memenuhi syarat untuk login OTP. Silakan masuk menggunakan password atau hubungi pengurus MAKT.',
      };
    }

    // 4b. Feature Flag & Canary Allowlist Enforcement
    const canaryCheck = await isOtpLoginPermitted(eligibility.userId);
    if (!canaryCheck.allowed) {
      console.warn('[AuthOTP Request Blocked]: Feature flag disabled or not in canary allowlist');
      return {
        success: false,
        error:
          'Nomor WhatsApp tidak terdaftar atau belum memenuhi syarat untuk login OTP. Silakan masuk menggunakan password atau hubungi pengurus MAKT.',
      };
    }

    // 5. Invoke Supabase Auth signInWithOtp with shouldCreateUser: false
    const supabase = await createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: {
        shouldCreateUser: false, // CRITICAL: NEVER CREATE NEW USER
      },
    });

    if (otpErr) {
      // Diagnostic server logging (sanitized, zero sensitive values)
      console.error('[AuthOTP Request Error]:', otpErr.name || 'GoTrueError');

      // Map potential GoTrue signup errors to the exact same neutral ineligible message
      const isSignupBlocked =
        otpErr.message?.toLowerCase().includes('signups not allowed') ||
        otpErr.message?.toLowerCase().includes('user not found');

      if (isSignupBlocked) {
        return {
          success: false,
          error:
            'Nomor WhatsApp tidak terdaftar atau belum memenuhi syarat untuk login OTP. Silakan masuk menggunakan password atau hubungi pengurus MAKT.',
        };
      }

      // Never expose raw GoTrue error messages to browser
      return {
        success: false,
        error: 'Gagal mengirimkan kode OTP. Silakan coba beberapa saat lagi atau hubungi pengurus MAKT.',
      };
    }

    return {
      success: true,
      message: 'Kode OTP telah berhasil dikirimkan ke WhatsApp Anda.',
      cooldownSeconds: 60,
    };
  } catch {
    console.error('[AuthOTP Request Exception]');
    return {
      success: false,
      error: 'Terjadi kendala jaringan saat meminta kode OTP. Silakan coba lagi.',
    };
  }
}

/**
 * Step 2: Verify WhatsApp OTP for Login
 * - Canonicalize phone and clean token
 * - Supabase verifyOtp({ phone, token, type: 'sms' })
 * - Session cookies are automatically handled by @supabase/ssr
 * - Verify user role and block admin/super_admin from OTP session
 * - Never expose raw GoTrue internals or database errors to client
 */
export async function verifyLoginOtp(
  phoneInput: string,
  tokenInput: string
): Promise<LoginOtpResponse> {
  try {
    // 1. Validate phone
    const validation = await validateLoginPhone(phoneInput);
    if (!validation.isValid || !validation.e164) {
      return {
        success: false,
        error: validation.error || 'Nomor WhatsApp tidak valid.',
      };
    }

    const { e164 } = validation;

    // 2. Validate token
    const cleanToken = (tokenInput || '').replace(/\D/g, '');
    if (cleanToken.length !== 6) {
      return {
        success: false,
        error: 'Kode OTP harus berupa 6 digit angka.',
      };
    }

    // 3. Verify OTP via Supabase Auth
    const supabase = await createClient();
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164,
      token: cleanToken,
      type: 'sms', // Type 'sms' for passwordless OTP login
    });

    if (verifyErr || !verifyData?.user) {
      // Diagnostic server logging (sanitized, zero sensitive values)
      console.error('[AuthOTP Verify Error]:', verifyErr?.name || 'VerifyFailed');

      // Never leak raw GoTrue error strings to client
      return {
        success: false,
        error: 'Kode OTP salah atau telah kadaluarsa. Silakan periksa kembali atau minta kode baru.',
      };
    }

    const authUser = verifyData.user;

    // 4. Feature Flag & Canary Gate Check (Defense-in-depth)
    const canaryCheck = await isOtpLoginPermitted(authUser.id);
    if (!canaryCheck.allowed) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Layanan login OTP saat ini belum dibuka untuk akun Anda. Silakan masuk menggunakan password.',
      };
    }

    // 5. Role Gate Check (Defense-in-depth: Ensure admins cannot use OTP session)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Akun administrator wajib masuk menggunakan password demi keamanan.',
      };
    }

    // 5. Revalidate cache
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Alhamdulillah, login berhasil.',
      redirectUrl: '/dashboard',
    };
  } catch {
    console.error('[AuthOTP Verify Exception]');
    return {
      success: false,
      error: 'Terjadi kendala jaringan saat memverifikasi kode OTP. Silakan coba lagi.',
    };
  }
}
