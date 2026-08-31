// Server-only client for the RGIPT ERP mail-OTP API. The API key must never
// reach the app (mobile/web) - it lives only in this backend's env config,
// and only this file ever calls the ERP endpoint.
const ERP_MAIL_OTP_URL =
  process.env.ERP_MAIL_OTP_API_URL ?? "http://rgipterp.com/erp/appapk/api-send-mail-otp.php";
const ERP_MAIL_OTP_API_KEY = process.env.ERP_MAIL_OTP_API_KEY;

export async function sendErpMailOtp(params: { mailTo: string; otp: string }): Promise<void> {
  if (!ERP_MAIL_OTP_API_KEY) {
    throw new Error("ERP_MAIL_OTP_API_KEY is not configured");
  }

  const response = await fetch(ERP_MAIL_OTP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": ERP_MAIL_OTP_API_KEY,
    },
    body: JSON.stringify({ type: "email", mail_to: params.mailTo, otp: params.otp }),
  });

  if (!response.ok) {
    throw new Error(`ERP mail OTP API responded with ${response.status}`);
  }
}
