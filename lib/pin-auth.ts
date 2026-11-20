// Server-only: logika PIN, OTP WhatsApp, dan pembatasan percobaan.
// Jangan diimpor dari client component.
import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------
export const PIN_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // kode berlaku 10 menit
export const OTP_MAX_ATTEMPTS = 5; // salah memasukkan kode maksimal 5x
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // jeda kirim ulang 1 menit
export const OTP_MAX_PER_PHONE_PER_DAY = 5;
export const OTP_MAX_PER_IP_PER_DAY = 20;
export const LOGIN_MAX_FAILS = 5; // 5x salah PIN ...
export const LOGIN_LOCK_MS = 30 * 60 * 1000; // ... dikunci 30 menit
export const LOGIN_MAX_FAILS_PER_IP = 30; // per alamat IP per jam
const LOGIN_IP_WINDOW_MS = 60 * 60 * 1000;

export type OtpPurpose = 'register' | 'reset_pin';

// ---------------------------------------------------------------------------
// Rahasia server (pepper)
// ---------------------------------------------------------------------------
function getPepper(): string {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error('Konfigurasi server belum lengkap (PIN_PEPPER). Hubungi admin.');
  }
  return pepper;
}

function hmac(input: string): string {
  return createHmac('sha256', getPepper()).update(input).digest('base64url');
}

// ---------------------------------------------------------------------------
// Email login & PIN
// ---------------------------------------------------------------------------

/** Email internal yang dipakai Supabase Auth untuk nomor WA (format sejak awal aplikasi). */
export function loginEmailForPhone(phone: string): string {
  return `${phone}@qurban.makt.id`;
}

/**
 * Password Supabase yang diturunkan dari PIN.
 * PIN 6 digit terlalu pendek untuk disimpan langsung sebagai password, karena
 * siapa pun bisa mencoba menebaknya langsung ke API Supabase tanpa melewati
 * aplikasi. Dengan HMAC + rahasia server, password asli tidak bisa ditebak
 * tanpa rahasia tersebut, dan satu-satunya jalan login adalah lewat server
 * aplikasi yang menerapkan kunci otomatis.
 */
export function derivePinPassword(email: string, pin: string): string {
  // Akhiran tetap ".Aa1" menjamin syarat karakter password Supabase (huruf besar/kecil, angka, simbol) selalu terpenuhi.
  return 'pin1.' + hmac(`pin:${email.toLowerCase()}:${pin}`) + '.Aa1';
}

/** Mengembalikan pesan error jika PIN tidak valid/terlalu mudah ditebak, selain itu null. */
export function validatePin(pin: unknown): string | null {
  if (typeof pin !== 'string' || !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return `PIN harus ${PIN_LENGTH} digit angka.`;
  }
  if (/^(\d)\1+$/.test(pin)) {
    return 'PIN tidak boleh angka yang sama semua (mis. 111111).';
  }
  // Termasuk urutan yang "berputar" seperti 890123 atau 210987
  const ascending = '0123456789012345';
  const descending = '9876543210987654';
  if (ascending.includes(pin) || descending.includes(pin)) {
    return 'PIN tidak boleh angka berurutan (mis. 123456).';
  }
  const common = ['123123', '112233', '121212', '111222', '159753', '147258', '102030', '010203', '123321', '456456', '789789'];
  if (common.includes(pin)) {
    return 'PIN terlalu mudah ditebak. Gunakan kombinasi lain.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pencarian akun
// ---------------------------------------------------------------------------
export async function findAuthUserIdByPhone(phone: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc('get_auth_user_id_by_email', {
    p_email: loginEmailForPhone(phone),
  });
  if (error) {
    console.error('get_auth_user_id_by_email failed:', error);
    throw new Error('Database belum diperbarui. Jalankan migrasi 20261120000000_registration_otp_pin_approval.sql.');
  }
  return (data as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// IP pemanggil (untuk pembatasan)
// ---------------------------------------------------------------------------
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip')?.trim() || 'unknown';
}

// ---------------------------------------------------------------------------
// OTP WhatsApp
// ---------------------------------------------------------------------------
function hashOtp(purpose: OtpPurpose, phone: string, code: string): string {
  return hmac(`otp:${purpose}:${phone}:${code}`);
}

export type OtpIssueResult =
  | { ok: true; code: string; otpId: string }
  | { ok: false; error: string };

/** Membuat kode OTP baru (dengan pembatasan). Pengiriman WA dilakukan pemanggil. */
export async function issueOtp(purpose: OtpPurpose, phone: string, ip: string): Promise<OtpIssueResult> {
  const adminClient = createAdminClient();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await adminClient
    .from('phone_otps')
    .select('created_at')
    .eq('phone', phone)
    .eq('purpose', purpose)
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false });

  if (recent && recent.length > 0) {
    const last = new Date(recent[0].created_at).getTime();
    const wait = OTP_RESEND_COOLDOWN_MS - (now - last);
    if (wait > 0) {
      return { ok: false, error: `Tunggu ${Math.ceil(wait / 1000)} detik sebelum meminta kode lagi.` };
    }
    if (recent.length >= OTP_MAX_PER_PHONE_PER_DAY) {
      return { ok: false, error: 'Batas permintaan kode untuk nomor ini sudah tercapai. Coba lagi besok atau hubungi admin.' };
    }
  }

  if (ip !== 'unknown') {
    const { count } = await adminClient
      .from('phone_otps')
      .select('id', { count: 'exact', head: true })
      .eq('request_ip', ip)
      .gte('created_at', dayAgo);
    if ((count ?? 0) >= OTP_MAX_PER_IP_PER_DAY) {
      return { ok: false, error: 'Terlalu banyak permintaan kode dari jaringan ini. Coba lagi nanti.' };
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const { data: inserted, error } = await adminClient
    .from('phone_otps')
    .insert({
      phone,
      purpose,
      code_hash: hashOtp(purpose, phone, code),
      expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      request_ip: ip,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('Failed to store OTP:', error);
    return { ok: false, error: 'Gagal membuat kode verifikasi. Pastikan migrasi database sudah dijalankan.' };
  }
  return { ok: true, code, otpId: inserted.id };
}

/** Menghapus OTP yang gagal terkirim agar tidak menghabiskan jatah. */
export async function discardOtp(otpId: string): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient.from('phone_otps').delete().eq('id', otpId);
}

/**
 * Memeriksa kode OTP terbaru untuk nomor & tujuan tertentu.
 * Kode hanya bisa dipakai sekali dan maksimal OTP_MAX_ATTEMPTS kali percobaan.
 */
export async function verifyOtp(purpose: OtpPurpose, phone: string, code: unknown): Promise<string | null> {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return 'Kode verifikasi harus 6 digit angka.';
  }
  const adminClient = createAdminClient();
  const { data: otp } = await adminClient
    .from('phone_otps')
    .select('id, code_hash, attempts, consumed_at, expires_at')
    .eq('phone', phone)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.consumed_at) {
    return 'Kode verifikasi tidak ditemukan. Silakan minta kode baru.';
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return 'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.';
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return 'Terlalu banyak percobaan salah. Silakan minta kode baru.';
  }

  const expected = Buffer.from(otp.code_hash);
  const actual = Buffer.from(hashOtp(purpose, phone, code));
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    await adminClient.from('phone_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
    const left = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    return left > 0
      ? `Kode verifikasi salah. Sisa percobaan: ${left}.`
      : 'Kode verifikasi salah. Silakan minta kode baru.';
  }

  // Tandai terpakai (hanya jika belum dipakai, mencegah pemakaian ganda bersamaan)
  const { data: consumed } = await adminClient
    .from('phone_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', otp.id)
    .is('consumed_at', null)
    .select('id');
  if (!consumed || consumed.length === 0) {
    return 'Kode verifikasi sudah dipakai. Silakan minta kode baru.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Kunci otomatis login PIN
// ---------------------------------------------------------------------------
const ipKey = (ip: string) => `ip:${ip}`;

/** Mengembalikan pesan jika nomor/IP sedang dikunci, selain itu null. */
export async function checkLoginLock(phone: string, ip: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const keys = ip !== 'unknown' ? [phone, ipKey(ip)] : [phone];
  const { data } = await adminClient
    .from('login_attempts')
    .select('phone, failed_count, locked_until, updated_at')
    .in('phone', keys);

  const now = Date.now();
  for (const row of data || []) {
    if (row.phone === phone && row.locked_until && new Date(row.locked_until).getTime() > now) {
      const minutes = Math.ceil((new Date(row.locked_until).getTime() - now) / 60000);
      return `Terlalu banyak PIN salah. Akun dikunci sementara, coba lagi dalam ${minutes} menit atau gunakan "Lupa PIN".`;
    }
    if (
      row.phone !== phone &&
      row.failed_count >= LOGIN_MAX_FAILS_PER_IP &&
      now - new Date(row.updated_at).getTime() < LOGIN_IP_WINDOW_MS
    ) {
      return 'Terlalu banyak percobaan login dari jaringan ini. Coba lagi nanti.';
    }
  }
  return null;
}

/** Mencatat PIN salah. Mengembalikan sisa percobaan sebelum dikunci. */
export async function recordLoginFailure(phone: string, ip: string): Promise<number> {
  const adminClient = createAdminClient();
  const now = Date.now();

  const { data: row } = await adminClient
    .from('login_attempts')
    .select('failed_count, locked_until')
    .eq('phone', phone)
    .maybeSingle();

  // Hitungan dimulai ulang setelah masa kunci berakhir
  const lockExpired = row?.locked_until && new Date(row.locked_until).getTime() <= now;
  const fails = (lockExpired ? 0 : row?.failed_count ?? 0) + 1;
  const lockedUntil = fails >= LOGIN_MAX_FAILS ? new Date(now + LOGIN_LOCK_MS).toISOString() : null;

  await adminClient.from('login_attempts').upsert({
    phone,
    failed_count: fails,
    locked_until: lockedUntil,
    updated_at: new Date(now).toISOString(),
  });

  if (ip !== 'unknown') {
    const { data: ipRow } = await adminClient
      .from('login_attempts')
      .select('failed_count, updated_at')
      .eq('phone', ipKey(ip))
      .maybeSingle();
    const windowExpired = !ipRow || now - new Date(ipRow.updated_at).getTime() >= LOGIN_IP_WINDOW_MS;
    await adminClient.from('login_attempts').upsert({
      phone: ipKey(ip),
      failed_count: windowExpired ? 1 : ipRow.failed_count + 1,
      locked_until: null,
      updated_at: new Date(now).toISOString(),
    });
  }

  return Math.max(0, LOGIN_MAX_FAILS - fails);
}

export async function clearLoginFailures(phone: string): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient.from('login_attempts').delete().eq('phone', phone);
}
