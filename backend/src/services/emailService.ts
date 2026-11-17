import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export interface SendOtpEmailInput {
  toEmail: string;
  otpCode: string;
  purpose: 'REGISTER_VERIFY' | 'PASSWORD_RESET';
}

export interface SendOtpEmailResult {
  isDeliveredByEmail: boolean;
  deliveryChannel: 'RESEND_EMAIL' | 'DEV_CONSOLE_FALLBACK';
  notice: string;
}

function buildOtpEmailSubject(purpose: SendOtpEmailInput['purpose'], otpCode: string): string {
  if (purpose === 'REGISTER_VERIFY') {
    return `${otpCode} adalah kode verifikasi pendaftaran PayBridge`;
  }
  return `${otpCode} adalah kode OTP reset kata sandi PayBridge`;
}

function buildOtpEmailHtml(purpose: SendOtpEmailInput['purpose'], otpCode: string): string {
  const heading =
    purpose === 'REGISTER_VERIFY'
      ? 'Verifikasi Email Pendaftaran PayBridge'
      : 'Pemulihan Kata Sandi PayBridge';
  const description =
    purpose === 'REGISTER_VERIFY'
      ? 'Gunakan kode OTP 6 digit berikut untuk menyelesaikan pendaftaran akun merchant Anda:'
      : 'Gunakan kode OTP 6 digit berikut untuk mengatur ulang kata sandi akun PayBridge Anda:';

  return `
    <div style="background-color:#F5F1E8;padding:32px 16px;font-family:system-ui,-apple-system,sans-serif;color:#14213D;">
      <div style="max-width:480px;margin:0 auto;background-color:#FFFDF8;border:1px solid #D8D2C4;border-radius:6px;padding:28px;">
        <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#5C5A52;font-weight:600;">
          PayBridge Security
        </p>
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#14213D;">${heading}</h1>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#5C5A52;">${description}</p>
        <div style="padding:16px;background-color:#EFEAE0;border:2px solid #C23B1E;border-radius:4px;text-align:center;font-family:monospace;font-size:28px;font-weight:700;letter-spacing:0.25em;color:#14213D;">
          ${otpCode}
        </div>
        <p style="margin:20px 0 0 0;font-size:12px;color:#5C5A52;">
          Kode ini berlaku selama 15 menit. Jangan bagikan kode ini kepada siapa pun.
        </p>
      </div>
    </div>
  `;
}

export async function sendOtpEmail(input: SendOtpEmailInput): Promise<SendOtpEmailResult> {
  const hasResendKey =
    Boolean(env.RESEND_API_KEY) && !env.RESEND_API_KEY.includes('YOUR_RESEND_API_KEY');

  if (!hasResendKey) {
    return fallbackToDevConsole(input, 'RESEND_API_KEY belum dikonfigurasi.');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [input.toEmail],
        subject: buildOtpEmailSubject(input.purpose, input.otpCode),
        html: buildOtpEmailHtml(input.purpose, input.otpCode),
      }),
    });

    if (response.ok) {
      return {
        isDeliveredByEmail: true,
        deliveryChannel: 'RESEND_EMAIL',
        notice: `Kode OTP 6 digit telah dikirim ke email ${input.toEmail} melalui Resend.`,
      };
    }

    const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
    return fallbackToDevConsole(
      input,
      errorBody.message ?? `Resend HTTP ${response.status}`,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Network error';
    return fallbackToDevConsole(input, reason);
  }
}

function fallbackToDevConsole(
  input: SendOtpEmailInput,
  reason: string,
): SendOtpEmailResult {
  if (env.NODE_ENV === 'production') {
    throw new AppError(
      `Gagal mengirim email OTP ke ${input.toEmail}: ${reason}`,
      502,
      'EMAIL_DELIVERY_FAILED',
      'Pastikan domain pengirim di Resend sudah diverifikasi dan RESEND_FROM_EMAIL sesuai.',
    );
  }

  console.log(
    `\n[PayBridge OTP - ${input.purpose}] Email: ${input.toEmail} | Kode OTP: ${input.otpCode} (Catatan Resend: ${reason})\n`,
  );

  return {
    isDeliveredByEmail: false,
    deliveryChannel: 'DEV_CONSOLE_FALLBACK',
    notice: `Resend berada pada mode sandbox (${reason}). Untuk pengujian lokal, gunakan kode OTP: ${input.otpCode}`,
  };
}
