// Server-only client for the RGIPT ERP OTP API (email and SMS both go
// through the same endpoint, distinguished by `type`). The API key must
// never reach the app (mobile/web) - it lives only in this backend's env
// config, and only this file ever calls the ERP endpoint.
const ERP_OTP_URL =
  process.env.ERP_MAIL_OTP_API_URL ?? "http://rgipterp.com/erp/appapk/api-send-mail-otp.php";
const ERP_OTP_API_KEY = process.env.ERP_MAIL_OTP_API_KEY;

async function sendErpOtp(body: Record<string, string>): Promise<void> {
  if (!ERP_OTP_API_KEY) {
    throw new Error("ERP_MAIL_OTP_API_KEY is not configured");
  }

  const response = await fetch(ERP_OTP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": ERP_OTP_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`ERP OTP API responded with ${response.status}`);
  }
}

export async function sendErpMailOtp(params: { mailTo: string; otp: string }): Promise<void> {
  await sendErpOtp({ type: "email", mail_to: params.mailTo, otp: params.otp });
}

// mobile must be exactly 10 digits per the ERP API spec - validate before
// calling, since the caller is best placed to decide what to do when a
// stored mobile number doesn't qualify (e.g. skip SMS, log, still send email).
export async function sendErpSmsOtp(params: { mobile: string; otp: string }): Promise<void> {
  await sendErpOtp({ type: "otp", mobile: params.mobile, otp: params.otp });
}
