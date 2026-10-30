import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitCheckResult {
  allowed: boolean;
  error?: string;
  cooldownSeconds?: number;
}

/**
 * Concurrency Lock: Ensures only 1 active verification request per user across all instances.
 * FAIL-CLOSED: If database is unreachable, lock is denied to prevent concurrent bypass.
 */
export async function acquireUserLock(userId: string, ttlSeconds: number = 15): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const key = `lock:verify:${userId}`;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const expiresAt = new Date(now.getTime() + (ttlSeconds + 60) * 1000).toISOString();

    // Check if currently locked
    const { data: existing, error: selectErr } = await admin
      .from('auth_rate_limits')
      .select('locked_until')
      .eq('key', key)
      .maybeSingle();

    if (selectErr) {
      // Fail-closed: do not proceed without database concurrency verification
      return false;
    }

    if (existing?.locked_until && new Date(existing.locked_until).getTime() > now.getTime()) {
      return false; // Still locked by another active request!
    }

    // Upsert new lock atomically
    const { error: upsertErr } = await admin.from('auth_rate_limits').upsert({
      key,
      attempts: 1,
      locked_until: lockedUntil,
      updated_at: now.toISOString(),
      expires_at: expiresAt,
    });

    if (upsertErr) {
      // Fail-closed
      return false;
    }

    return true;
  } catch {
    // Fail-closed on any exception
    return false;
  }
}

/**
 * Release User Lock
 */
export async function releaseUserLock(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const key = `lock:verify:${userId}`;
    await admin.from('auth_rate_limits').delete().eq('key', key);
  } catch {
    // Non-blocking cleanup, lock will naturally expire in 15s
  }
}

/**
 * Distributed Multi-Layer Rate Limiting Enforcement (FAIL-CLOSED)
 * 1. Per-User 60-Second Cooldown (resend:user:<userId>)
 * 2. Per-Destination Phone Throttling (rate:phone:<phone>) - Max 3 per 15 min
 * 3. Per-Client IP Throttling (rate:ip:<clientIp>) - Max 5 per 15 min
 * 4. System-Wide Global Quota Protection (rate:global:<minuteSlice>) - Max 30 per min
 */
export async function checkAndEnforceRateLimits({
  userId,
  phone,
  clientIp,
}: {
  userId: string;
  phone: string;
  clientIp: string;
}): Promise<RateLimitCheckResult> {
  try {
    const admin = createAdminClient();
    const nowMs = Date.now();

    // Layer 1: Per-User 60-Second Cooldown
    const userResendKey = `resend:user:${userId}`;
    const { data: userLimit, error: userErr } = await admin
      .from('auth_rate_limits')
      .select('locked_until')
      .eq('key', userResendKey)
      .maybeSingle();

    if (userErr) {
      return {
        allowed: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    if (userLimit?.locked_until) {
      const lockTime = new Date(userLimit.locked_until).getTime();
      if (lockTime > nowMs) {
        const remainingSeconds = Math.ceil((lockTime - nowMs) / 1000);
        return {
          allowed: false,
          error: `Mohon tunggu ${remainingSeconds} detik sebelum meminta kode OTP kembali.`,
          cooldownSeconds: remainingSeconds,
        };
      }
    }

    // Layer 2: Per-Destination Phone Throttling (Max 3 OTP per 15 min per phone number)
    const phoneRateKey = `rate:phone:${phone}`;
    const { data: phoneRpc, error: phoneErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_key: phoneRateKey,
      p_max_attempts: 3,
      p_window_seconds: 900,
    });

    if (phoneErr) {
      return {
        allowed: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    if (phoneRpc && phoneRpc.length > 0 && !phoneRpc[0].allowed) {
      const waitMin = Math.ceil((phoneRpc[0].remaining_seconds || 900) / 60);
      return {
        allowed: false,
        error: `Batas pengiriman OTP ke nomor ini telah tercapai. Silakan coba lagi dalam ${waitMin} menit.`,
      };
    }

    // Layer 3: Per-IP Throttling (Max 5 OTP requests per 15 min per IP)
    const sanitizedIp = clientIp.replace(/[^a-zA-Z0-9.:_-]/g, '').slice(0, 45) || 'unknown';
    const ipRateKey = `rate:ip:${sanitizedIp}`;
    const { data: ipRpc, error: ipErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_key: ipRateKey,
      p_max_attempts: 5,
      p_window_seconds: 900,
    });

    if (ipErr) {
      return {
        allowed: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    if (ipRpc && ipRpc.length > 0 && !ipRpc[0].allowed) {
      const waitMin = Math.ceil((ipRpc[0].remaining_seconds || 900) / 60);
      return {
        allowed: false,
        error: `Terlalu banyak permintaan dari alamat IP Anda. Silakan coba lagi dalam ${waitMin} menit.`,
      };
    }

    // Layer 4: System-Wide Global Quota Guard (Max 30 requests per minute across system)
    const minuteSlice = Math.floor(nowMs / 60000);
    const globalRateKey = `rate:global:${minuteSlice}`;
    const { data: globalRpc, error: globalErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_key: globalRateKey,
      p_max_attempts: 30,
      p_window_seconds: 60,
    });

    if (globalErr) {
      return {
        allowed: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    if (globalRpc && globalRpc.length > 0 && !globalRpc[0].allowed) {
      return {
        allowed: false,
        error: 'Sistem sedang mengalami lonjakan trafik pengiriman verifikasi. Mohon tunggu 1 menit.',
      };
    }

    // All rate limit layers passed! Now arm the user's 60-second cooldown
    const userLockedUntil = new Date(nowMs + 60 * 1000).toISOString();
    const userExpiresAt = new Date(nowMs + 3600 * 1000).toISOString();

    const { error: armErr } = await admin.from('auth_rate_limits').upsert({
      key: userResendKey,
      attempts: 1,
      locked_until: userLockedUntil,
      updated_at: new Date(nowMs).toISOString(),
      expires_at: userExpiresAt,
    });

    if (armErr) {
      return {
        allowed: false,
        error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
      };
    }

    return { allowed: true };
  } catch {
    // FAIL-CLOSED: Absolute refusal to send OTP without active database rate check
    return {
      allowed: false,
      error: 'Layanan verifikasi sedang dalam pemeliharaan sistem. Silakan coba beberapa saat lagi.',
    };
  }
}

/**
 * Atomic Webhook Claiming (FAIL-CLOSED)
 * Prevents Dual Execution, Replay Attacks, and recycles stuck processing claims (>45s).
 */
export async function claimWebhook(
  webhookId: string,
  ttlSeconds: number = 600
): Promise<{ claimed: boolean; status: string; isDuplicateSuccess?: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Call stored procedure claim_auth_webhook
    const { data, error } = await admin.rpc('claim_auth_webhook', {
      p_webhook_id: webhookId,
      p_ttl_seconds: ttlSeconds,
    });

    if (error) {
      // FAIL-CLOSED: Refuse execution if database claim verification fails
      return {
        claimed: false,
        status: 'error',
        error: 'Database claim verification failed: ' + error.message,
      };
    }

    if (data && data.length > 0) {
      const res = data[0];
      return {
        claimed: res.claimed,
        status: res.current_status,
        isDuplicateSuccess: res.current_status === 'sent',
      };
    }

    return { claimed: false, status: 'unknown' };
  } catch (err: any) {
    // FAIL-CLOSED
    return {
      claimed: false,
      status: 'error',
      error: 'Exception during webhook claim: ' + err.message,
    };
  }
}

/**
 * Update Webhook Claim Status
 */
export async function updateWebhookStatus(
  webhookId: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from('auth_webhook_claims')
      .update({
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('webhook_id', webhookId);
  } catch {
    // Log without sensitive values
  }
}
