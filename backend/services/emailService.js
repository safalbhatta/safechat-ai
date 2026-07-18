const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

/**
 * Send a 6-digit OTP to the user's email via Resend.
 * @param {string} toEmail  - recipient address
 * @param {string} otp      - plain-text 6-digit code
 * @param {string} username - used to personalise the email
 */
const sendOtpEmail = async (toEmail, otp, username) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>SafeChat – Password Reset OTP</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(99,102,241,0.12);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                    🔐 SafeChat AI
                  </h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                    Password Reset Request
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:15px;">
                    Hi <strong>${username || "there"}</strong>,
                  </p>
                  <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                    We received a request to reset your SafeChat password. Use the code below — it expires in <strong>10 minutes</strong>.
                  </p>

                  <!-- OTP box -->
                  <div style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:2px solid #c7d2fe;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 8px;color:#6366F1;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                      Your OTP Code
                    </p>
                    <p style="margin:0;color:#1e1b4b;font-size:42px;font-weight:900;letter-spacing:10px;">
                      ${otp}
                    </p>
                  </div>

                  <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;line-height:1.5;">
                    If you didn't request a password reset, you can safely ignore this email — your account is not at risk.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    © ${new Date().getFullYear()} SafeChat AI · This is an automated message, please do not reply.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${otp} is your SafeChat password reset code`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
};

module.exports = { sendOtpEmail };
