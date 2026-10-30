'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatE164 } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
  acquireUserLock,
  releaseUserLock,
  checkAndEnforceRateLimits,
} from '@/lib/auth-rate-limit';

export interface PhoneVerificationState {
  isVerified: boolean;
  phone: string | null;
  phoneConfirmedAt: string | null;
}

/**
 * Check phone verification status for current authenticated user
 */
export async function getPhoneVerificationStatus(): Promise<PhoneVerificationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isVerified: false, phone: null, phoneConfirmedAt: null };
  }

  const isVerified = Boolean(user.phone && user.phone_confirmed_at);

  return {
    isVerified,
    phone: user.phone || null,
    phoneConfirmedAt: user.phone_confirmed_at || null,
  };
}

/**
 * Step 1: Request phone linking OTP via Supabase updateUser
 * FAIL-CLOSED: Rejects request if database concurrency locks or rate limit checks fail.
 */
export async function initiatePhoneVerification(phoneInput: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  cooldownSeconds?: number;
}> {
  let currentUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sesi login tidak valid. Silakan masuk terlebih dahulu.' };
    }

    currentUserId = user.id;

    // 0. Concurrency Lock: Prevent parallel / duplicate requests across distributed instances
    const hasLock = await acquireUserLock(user.id, 15);
    if (!hasLock) {
      return {
        success: false,
        error: 'Permintaan verifikasi sedang diproses atau sistem sedang sibuk. Mohon tunggu sejenak.',
      };
    }

    // 1. Canonicalize phone to E.164 (+62...)
    const { e164, formatted, error: formatErr } = formatE164(phoneInput);
    if (!e164 || !formatted || formatErr) {
      return { success: false, error: formatErr || 'Format nomor WhatsApp tidak valid.' };
    }

    // 2. Extract Client IP for throttling
    const headerList = await headers();
    const clientIp =
      headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headerList.get('x-real-ip') ||
      '127.0.0.1';

    // 3. Multi-Layer Rate Limiting Enforcement (FAIL-CLOSED)
    // Enforces user cooldown, destination phone quota, IP rate limit, and global surge guard
    const rateCheck = await checkAndEnforceRateLimits({
      userId: user.id,
      phone: e164,
      clientIp,
    });

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.error || 'Batas pengiriman kode tercapai. Mohon tunggu sejenak.',
        cooldownSeconds: rateCheck.cooldownSeconds,
      };
    }

    // 4. Anti-duplication check across profiles and auth.users
    const admin = createAdminClient();

    // Check profiles: is this phone owned by a different user?
    const { data: conflictingProfile, error: profErr } = await admin
      .from('profiles')
      .select('id, full_name')
      .or(`phone.eq.${formatted},phone_normalized.eq.${formatted}`)
      .neq('id', user.id)
      .maybeSingle();

    if (profErr) {
      return {
        success: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    if (conflictingProfile) {
      return {
        success: false,
        error:
          'Nomor WhatsApp ini sudah terdaftar pada akun lain. Silakan hubungi pengurus MAKT jika ini adalah nomor Anda.',
      };
    }

    // Check auth.users: has another user confirmed this phone?
    const { data: authData, error: authErr } = await admin.auth.admin.listUsers();
    if (authErr) {
      return {
        success: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    const conflictingAuthUser = authData?.users?.find(
      (u) => u.phone === e164 && u.id !== user.id && Boolean(u.phone_confirmed_at)
    );

    if (conflictingAuthUser) {
      return {
        success: false,
        error:
          'Nomor WhatsApp ini sudah terverifikasi pada akun lain. Tidak dapat menautkan nomor duplikat.',
      };
    }

    // Check if current user already has this exact phone confirmed
    if (user.phone === e164 && user.phone_confirmed_at) {
      return {
        success: false,
        error: 'Nomor WhatsApp ini sudah terverifikasi pada akun Anda.',
      };
    }

    // 5. Trigger Supabase official updateUser
    const { error: updateErr } = await supabase.auth.updateUser({
      phone: e164,
    });

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || 'Gagal mengirimkan kode OTP. Silakan coba lagi nanti.',
      };
    }

    return {
      success: true,
      message: 'Kode OTP 6-digit telah dikirimkan ke nomor WhatsApp Anda.',
      cooldownSeconds: 60,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses permintaan verifikasi.',
    };
  } finally {
    if (currentUserId) {
      await releaseUserLock(currentUserId);
    }
  }
}

/**
 * Step 2: Confirm OTP via Supabase verifyOtp(type: 'phone_change')
 */
export async function confirmPhoneVerification(
  phoneInput: string,
  otpToken: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  let currentUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: preUser },
    } = await supabase.auth.getUser();

    if (!preUser) {
      return { success: false, error: 'Sesi login telah berakhir. Silakan masuk kembali.' };
    }

    currentUserId = preUser.id;

    // Concurrency Lock
    const hasLock = await acquireUserLock(currentUserId, 15);
    if (!hasLock) {
      return {
        success: false,
        error: 'Proses verifikasi sedang berlangsung. Mohon tunggu.',
      };
    }

    const preVerifyUserId = preUser.id;

    // 1. Canonicalize phone to E.164
    const { e164, formatted, error: formatErr } = formatE164(phoneInput);
    if (!e164 || !formatted || formatErr) {
      return { success: false, error: formatErr || 'Format nomor WhatsApp tidak valid.' };
    }

    // 2. Validate token format (6 digits)
    const cleanToken = otpToken.trim();
    if (!/^\d{6}$/.test(cleanToken)) {
      return { success: false, error: 'Kode OTP harus berupa 6 digit angka.' };
    }

    // 3. Call Supabase verifyOtp with type: 'phone_change'
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164,
      token: cleanToken,
      type: 'phone_change',
    });

    if (verifyErr || !verifyData?.user) {
      return {
        success: false,
        error: verifyErr?.message || 'Kode OTP salah atau telah kadaluarsa. Silakan periksa kembali.',
      };
    }

    const postVerifyUser = verifyData.user;

    // 4. STRICT IDENTITY INTEGRITY GATE
    // Verify that the UUID has NOT changed under any circumstances!
    if (postVerifyUser.id !== preVerifyUserId) {
      return {
        success: false,
        error: 'Peringatan Keamanan: Terjadi inkonsistensi identitas akun. Operasi dibatalkan.',
      };
    }

    // Ensure phone is confirmed by GoTrue
    if (!postVerifyUser.phone_confirmed_at) {
      return {
        success: false,
        error: 'Nomor telepon belum terkonfirmasi oleh sistem autentikasi.',
      };
    }

    // 5. Synchronize profiles table
    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({
        phone: formatted,
        phone_normalized: formatted,
        wa_opt_in: true,
        wa_opt_in_at: new Date().toISOString(),
      })
      .eq('id', preVerifyUserId);

    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        'Alhamdulillah! Nomor WhatsApp Anda telah berhasil diverifikasi dan ditautkan ke akun tabungan.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memverifikasi kode OTP.',
    };
  } finally {
    if (currentUserId) {
      await releaseUserLock(currentUserId);
    }
  }
}
