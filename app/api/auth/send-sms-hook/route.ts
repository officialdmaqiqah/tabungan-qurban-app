import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Webhook } from 'standardwebhooks';
import { claimWebhook, updateWebhookStatus } from '@/lib/auth-rate-limit';

interface SupabaseSmsHookPayload {
  user?: {
    id?: string;
    phone?: string;
    phone_change?: string;
    email?: string;
    [key: string]: any;
  };
  sms?: {
    otp?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  let webhookId: string | null = null;
  try {
    const rawBody = await req.text();
    const rawHookSecret = (process.env.SUPABASE_AUTH_HOOK_SECRET || '').trim();
    // Normalize secret: Supabase dashboard often prefixes Standard Webhooks secrets with 'v1,'
    const hookSecret = rawHookSecret.startsWith('v1,') ? rawHookSecret.slice(3) : rawHookSecret;

    const msgId = req.headers.get('webhook-id');
    const timestamp = req.headers.get('webhook-timestamp');
    const signatureHeader = req.headers.get('webhook-signature');
    const authHeader = req.headers.get('authorization');

    webhookId = msgId;

    // 1. Authenticate Request
    if (hookSecret) {
      let isVerified = false;

      // Method A: Standard Webhooks Signature Verification
      if (signatureHeader && msgId && timestamp) {
        try {
          const wh = new Webhook(hookSecret);
          wh.verify(rawBody, {
            'webhook-id': msgId,
            'webhook-timestamp': timestamp,
            'webhook-signature': signatureHeader,
          });
          isVerified = true;
        } catch (verifyErr: any) {
          console.error('[SendSMSHook Signature Error]:', verifyErr.name, '-', verifyErr.message);
          return NextResponse.json(
            { error: `Unauthorized: Webhook verification failed (${verifyErr.message})` },
            { status: 401 }
          );
        }
      } else {
        console.warn('[SendSMSHook Headers Missing]:', {
          hasMsgId: Boolean(msgId),
          hasTimestamp: Boolean(timestamp),
          hasSignature: Boolean(signatureHeader),
          hasAuthHeader: Boolean(authHeader),
        });
      }

      // Method B: Bearer Token Fallback
      if (!isVerified && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (
          token.length === hookSecret.length &&
          crypto.timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(hookSecret, 'utf8'))
        ) {
          isVerified = true;
        }
      }

      if (!isVerified) {
        console.warn('[SendSMSHook Authentication Failed]: isVerified is false');
        return NextResponse.json(
          { error: 'Unauthorized: Missing or invalid signature headers' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'SUPABASE_AUTH_HOOK_SECRET is not configured' },
        { status: 500 }
      );
    }

    // 2. Parse Payload
    let payload: SupabaseSmsHookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Diagnostic logging: Record field names ONLY for structure verification, zero values/secrets/OTPs
    console.log('[SendSMSHook Payload Structure]:', {
      userFields: payload.user ? Object.keys(payload.user) : [],
      smsFields: payload.sms ? Object.keys(payload.sms) : [],
      hasOtp: Boolean(payload.sms?.otp),
      topLevelKeys: Object.keys(payload),
    });

    // Support both phone_change (updating/adding phone) and existing phone
    const rawPhone = payload.user?.phone_change || payload.user?.phone;
    const otpCode = payload.sms?.otp;

    if (!rawPhone || !otpCode) {
      console.warn('[SendSMSHook Payload Missing]:', {
        hasPhoneChange: Boolean(payload.user?.phone_change),
        hasPhone: Boolean(payload.user?.phone),
        hasOtp: Boolean(otpCode),
      });
      return NextResponse.json(
        { error: 'Missing phone number or OTP code in payload' },
        { status: 400 }
      );
    }

    // 3. Canonicalize & Strictly Validate Indonesian Mobile Phone
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    // Strict validation: must start with 628 followed by 8 to 12 digits (total 11-15 digits)
    if (!/^628\d{8,12}$/.test(cleanPhone)) {
      console.warn('[SendSMSHook Invalid Phone Format]');
      return NextResponse.json(
        { error: 'Invalid Indonesian mobile phone number format' },
        { status: 400 }
      );
    }
    const xsenderPhone = cleanPhone;

    // 4. Persistent Replay & Concurrency Protection via Database Claim (FAIL-CLOSED)
    if (webhookId) {
      const claimResult = await claimWebhook(webhookId, 600);
      if (claimResult.error) {
        return NextResponse.json(
          { error: 'Service Unavailable: Security claim check offline' },
          { status: 503 }
        );
      }
      if (!claimResult.claimed) {
        if (claimResult.isDuplicateSuccess) {
          // Idempotent success: Message was already successfully delivered!
          return NextResponse.json({ success: true, idempotent: true });
        }
        return NextResponse.json(
          { error: `Duplicate or concurrent request for webhook-id: ${webhookId} (status: ${claimResult.status})` },
          { status: 409 }
        );
      }
    }

    // 5. Check Dry-Run flag
    const isDryRun = process.env.WA_DRY_RUN === 'true';
    if (isDryRun) {
      const maskedPhone = xsenderPhone.slice(0, 4) + '****' + xsenderPhone.slice(-3);
      console.log(`[SendSMSHook - DRY RUN] Simulated WhatsApp OTP delivery to: ${maskedPhone}`);
      if (webhookId) {
        await updateWebhookStatus(webhookId, 'sent');
      }
      return NextResponse.json({ success: true, dry_run: true });
    }

    // 6. XSender Send Text API Contract
    // Official Endpoint: https://xsender.id/send-message
    // Mandatory Body Fields: api_key, sender, number, message, footer
    const xsenderUrl = 'https://xsender.id/send-message';
    const xsenderKey = process.env.XSENDER_API_KEY;
    const xsenderSender = process.env.XSENDER_DEVICE_ID || process.env.XSENDER_SENDER_ID;

    if (!xsenderKey || !xsenderSender) {
      if (webhookId) {
        await updateWebhookStatus(webhookId, 'failed', 'Gateway configuration missing');
      }
      return NextResponse.json(
        { error: 'Gateway configuration missing' },
        { status: 500 }
      );
    }

    const formattedMessage = `[Tabungan Qurban MAKT]\nAssalamu'alaikum Wr. Wb.\n\nKode verifikasi nomor WhatsApp Anda adalah: *${otpCode}*\n\nKode berlaku selama 5 menit. Demi keamanan akun Anda, JANGAN berikan kode ini kepada siapapun termasuk pihak pengurus MAKT.`;

    const requestBody = {
      api_key: xsenderKey,
      sender: xsenderSender,
      number: xsenderPhone,
      message: formattedMessage,
      footer: 'Keamanan Akun Qurban MAKT',
    };

    let response: Response;
    try {
      response = await fetch(xsenderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(4200),
      });
    } catch (fetchErr: any) {
      const errMsg =
        fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError'
          ? 'Gateway timeout (exceeded 4.2s)'
          : 'Gateway network unreachable: ' + fetchErr.message;

      if (webhookId) {
        await updateWebhookStatus(webhookId, 'failed', errMsg);
      }

      return NextResponse.json(
        { error: errMsg },
        { status: 504 }
      );
    }

    let resData: any = null;
    try {
      resData = await response.json();
    } catch {
      resData = { message: await response.text() };
    }

    // Success condition: HTTP 2xx AND provider body status === true
    if (!response.ok || resData?.status !== true) {
      const errReason = resData?.msg || resData?.message || `HTTP ${response.status}`;
      if (webhookId) {
        await updateWebhookStatus(webhookId, 'failed', errReason);
      }
      return NextResponse.json(
        { error: 'Failed to dispatch WhatsApp message via gateway: ' + errReason },
        { status: 502 }
      );
    }

    // Mark as successfully dispatched only when response.ok && result.status === true
    if (webhookId) {
      await updateWebhookStatus(webhookId, 'sent');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (webhookId) {
      await updateWebhookStatus(webhookId, 'failed', 'Internal server error: ' + err.message);
    }
    return NextResponse.json(
      { error: 'Internal hook server error' },
      { status: 500 }
    );
  }
}
