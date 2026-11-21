'use server';

// Pendaftaran dengan OTP WhatsApp, login PIN, dan Lupa/Buat PIN.
// Semua aksi ini publik (dipanggil sebelum login), jadi setiap input divalidasi
// di server dan dibatasi (lihat lib/pin-auth.ts).

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatWhatsAppNumber } from '@/lib/utils';
import {
  checkLoginLock,
  clearLoginFailures,
  derivePinPasswordForPhone,
  discardOtp,
  findAuthAccountByPhone,
  findAuthUserIdByPhone,
  getClientIp,
  issueOtp,
  loginEmailForPhone,
  recordLoginFailure,
  validatePin,
  verifyOtp,
  type OtpPurpose,
} from '@/lib/pin-auth';
import { sendWhatsAppMessageInternal } from '@/lib/wa/send';
import { notifyAdminOnNewRegistration, sendRegistrationWelcomeWA } from '@/lib/wa/notifications';

export type ActionResult = { success: true; message?: string; redirectTo?: string } | { success: false; error: string };

const KATEGORI_OPTIONS = ['Pengurus Masjid', 'Remaja/Pemuda Masjid', 'Jamaah Masjid', 'Masyarakat Umum'];
const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizePhone(raw: unknown): { phone: string } | { error: string } {
  if (typeof raw !== 'string') return { error: 'Nomor WhatsApp tidak valid.' };
  const { formatted, error } = formatWhatsAppNumber(raw.trim());
  if (error || !formatted) return { error: error || 'Nomor WhatsApp tidak valid.' };
  return { phone: formatted };
}

async function sendOtpWhatsApp(purpose: OtpPurpose, phone: string): Promise<ActionResult> {
  const ip = await getClientIp();
  const issued = await issueOtp(purpose, phone, ip);
  if (!issued.ok) return { success: false, error: issued.error };

  const intro = purpose === 'register' ? 'pendaftaran' : 'pembuatan PIN';
  const result = await sendWhatsAppMessageInternal({
    to: phone,
    message: `Kode verifikasi ${intro} Tabungan Qurban MAKT: *${issued.code}*

Berlaku 10 menit. JANGAN berikan kode ini kepada siapa pun, termasuk panitia.`,
    logMessage: `Kode verifikasi ${intro} (disamarkan): ******`,
    eventType: purpose === 'register' ? 'otp_register' : 'otp_reset_pin',
  });

  if (result.status !== 'sent') {
    await discardOtp(issued.otpId);
    console.error('OTP WhatsApp not sent:', result);
    return {
      success: false,
      error: 'Kode verifikasi gagal dikirim ke WhatsApp. Pastikan nomor benar dan aktif di WhatsApp, atau hubungi admin.',
    };
  }
  return { success: true, message: 'Kode verifikasi sudah dikirim ke WhatsApp Anda.' };
}

/** Masuk (membuat sesi cookie) di server lalu menentukan halaman tujuan sesuai role. */
async function signInAndGetRedirect(email: string, password: string): Promise<{ redirectTo: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: error?.message || 'Gagal masuk.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  return { redirectTo: isAdmin ? '/admin' : '/dashboard' };
}

// ---------------------------------------------------------------------------
// Pendaftaran
// ---------------------------------------------------------------------------

/** Langkah 1 pendaftaran: kirim kode OTP ke nomor WA yang belum terdaftar. */
export async function requestRegistrationOtp(rawPhone: string): Promise<ActionResult> {
  try {
    const parsed = normalizePhone(rawPhone);
    if ('error' in parsed) return { success: false, error: parsed.error };

    if (await findAuthUserIdByPhone(parsed.phone)) {
      return { success: false, error: 'Nomor WhatsApp ini sudah terdaftar. Silakan masuk, atau gunakan "Lupa PIN" bila belum punya PIN.' };
    }
    return await sendOtpWhatsApp('register', parsed.phone);
  } catch (err) {
    console.error('requestRegistrationOtp error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan.' };
  }
}

export interface RegistrationInput {
  fullName: string;
  phone: string;
  pin: string;
  kategoriJamaah: string;
  gender: string;
  address: string;
  waOptIn: boolean;
  packageId?: string | null;
  otp: string;
}

/** Langkah 2 pendaftaran: verifikasi OTP lalu buat akun (status menunggu persetujuan). */
export async function completeRegistration(input: RegistrationInput): Promise<ActionResult> {
  try {
    if (!input || typeof input !== 'object') return { success: false, error: 'Data tidak valid.' };

    const parsed = normalizePhone(input.phone);
    if ('error' in parsed) return { success: false, error: parsed.error };
    const phone = parsed.phone;

    const fullName = typeof input.fullName === 'string' ? input.fullName.trim().replace(/\s+/g, ' ') : '';
    if (fullName.length < 3 || fullName.length > 100) {
      return { success: false, error: 'Nama lengkap harus 3–100 karakter.' };
    }
    if (!KATEGORI_OPTIONS.includes(input.kategoriJamaah)) return { success: false, error: 'Kategori tidak valid.' };
    if (!GENDER_OPTIONS.includes(input.gender)) return { success: false, error: 'Gender tidak valid.' };
    const address = typeof input.address === 'string' ? input.address.trim().slice(0, 500) : '';
    if (!address) return { success: false, error: 'Alamat wajib diisi.' };
    const pinError = validatePin(input.pin);
    if (pinError) return { success: false, error: pinError };
    const waOptIn = input.waOptIn === true;

    const otpError = await verifyOtp('register', phone, input.otp);
    if (otpError) return { success: false, error: otpError };

    const email = loginEmailForPhone(phone);
    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: derivePinPasswordForPhone(phone, input.pin),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        address,
        kategori_jamaah: input.kategoriJamaah,
        gender: input.gender,
        is_anonymous: false,
        wa_opt_in: waOptIn,
        wa_opt_in_at: waOptIn ? nowIso : null,
        wa_opt_in_source: 'register',
        phone_normalized: phone,
      },
    });

    if (createError || !created?.user) {
      const msg = createError?.message || '';
      if (/already|registered|exists/i.test(msg)) {
        return { success: false, error: 'Nomor WhatsApp ini sudah terdaftar. Silakan masuk.' };
      }
      console.error('createUser failed:', createError);
      return { success: false, error: 'Gagal membuat akun. Silakan coba lagi atau hubungi admin.' };
    }
    const userId = created.user.id;

    // Profil dibuat oleh trigger handle_new_user; lengkapi datanya.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        kategori_jamaah: input.kategoriJamaah,
        gender: input.gender,
        is_anonymous: false,
        pin_set_at: nowIso,
      })
      .eq('id', userId);
    if (profileError) console.error('Profile update after registration failed:', profileError);

    // Paket pilihan dari halaman depan (opsional)
    if (input.packageId && typeof input.packageId === 'string' && UUID_RE.test(input.packageId)) {
      const { data: pkg } = await adminClient.from('qurban_packages').select('id').eq('id', input.packageId).maybeSingle();
      if (pkg) {
        await adminClient.from('user_packages').insert({ user_id: userId, package_id: pkg.id, quantity: 1 });
      }
    }

    // Notifikasi WA (kegagalan tidak membatalkan pendaftaran)
    await Promise.allSettled([sendRegistrationWelcomeWA(userId), notifyAdminOnNewRegistration(userId)]);

    const signedIn = await signInAndGetRedirect(email, derivePinPasswordForPhone(phone, input.pin));
    if ('error' in signedIn) {
      return { success: true, message: 'Pendaftaran berhasil! Silakan masuk dengan nomor WA dan PIN Anda.', redirectTo: '/login' };
    }
    return { success: true, message: 'Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.', redirectTo: signedIn.redirectTo };
  } catch (err) {
    console.error('completeRegistration error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftar.' };
  }
}

// ---------------------------------------------------------------------------
// Login PIN
// ---------------------------------------------------------------------------
export async function loginWithPin(rawPhone: string, pin: string): Promise<ActionResult> {
  try {
    const parsed = normalizePhone(rawPhone);
    if ('error' in parsed) return { success: false, error: parsed.error };
    const phone = parsed.phone;
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return { success: false, error: 'PIN harus 6 digit angka.' };
    }

    const ip = await getClientIp();
    const lockMessage = await checkLoginLock(phone, ip);
    if (lockMessage) return { success: false, error: lockMessage };

    // Akun lama bisa masih memakai email domain lama selama masa peralihan
    const account = await findAuthAccountByPhone(phone);
    const email = account?.email ?? loginEmailForPhone(phone);
    const result = await signInAndGetRedirect(email, derivePinPasswordForPhone(phone, pin));

    if ('error' in result) {
      const left = await recordLoginFailure(phone, ip);

      // Bantu pengguna lama yang belum membuat PIN
      const userId = account?.userId;
      if (userId) {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient.from('profiles').select('pin_set_at').eq('id', userId).maybeSingle();
        if (profile && !profile.pin_set_at) {
          return {
            success: false,
            error: 'Akun Anda belum memiliki PIN. Klik "Buat PIN / Lupa PIN" di bawah untuk membuat PIN lewat kode WhatsApp.',
          };
        }
      }

      return {
        success: false,
        error: left > 0
          ? `Nomor WhatsApp atau PIN salah. Sisa percobaan: ${left}.`
          : 'Terlalu banyak PIN salah. Akun dikunci sementara 30 menit, atau gunakan "Lupa PIN".',
      };
    }

    await clearLoginFailures(phone);
    return { success: true, redirectTo: result.redirectTo };
  } catch (err) {
    console.error('loginWithPin error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.' };
  }
}

// ---------------------------------------------------------------------------
// Buat PIN / Lupa PIN
// ---------------------------------------------------------------------------
export async function requestPinResetOtp(rawPhone: string): Promise<ActionResult> {
  try {
    const parsed = normalizePhone(rawPhone);
    if ('error' in parsed) return { success: false, error: parsed.error };

    if (!(await findAuthUserIdByPhone(parsed.phone))) {
      return { success: false, error: 'Nomor WhatsApp ini belum terdaftar. Silakan daftar terlebih dahulu.' };
    }
    return await sendOtpWhatsApp('reset_pin', parsed.phone);
  } catch (err) {
    console.error('requestPinResetOtp error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan.' };
  }
}

export async function resetPinWithOtp(rawPhone: string, otp: string, pin: string): Promise<ActionResult> {
  try {
    const parsed = normalizePhone(rawPhone);
    if ('error' in parsed) return { success: false, error: parsed.error };
    const phone = parsed.phone;

    const pinError = validatePin(pin);
    if (pinError) return { success: false, error: pinError };

    const otpError = await verifyOtp('reset_pin', phone, otp);
    if (otpError) return { success: false, error: otpError };

    const account = await findAuthAccountByPhone(phone);
    if (!account) return { success: false, error: 'Akun tidak ditemukan.' };
    const { userId, email } = account;

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: derivePinPasswordForPhone(phone, pin),
    });
    if (error) {
      console.error('updateUserById (PIN) failed:', error);
      return { success: false, error: 'Gagal menyimpan PIN. Silakan coba lagi.' };
    }
    await adminClient.from('profiles').update({ pin_set_at: new Date().toISOString() }).eq('id', userId);
    await clearLoginFailures(phone);

    const signedIn = await signInAndGetRedirect(email, derivePinPasswordForPhone(phone, pin));
    if ('error' in signedIn) {
      return { success: true, message: 'PIN berhasil disimpan. Silakan masuk.', redirectTo: '/login' };
    }
    return { success: true, message: 'PIN berhasil disimpan.', redirectTo: signedIn.redirectTo };
  } catch (err) {
    console.error('resetPinWithOtp error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan.' };
  }
}
