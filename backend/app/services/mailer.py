import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_reset_email(to_email: str, reset_url: str):
    """
    Send password reset email via Gmail SMTP with a clickable reset link.
    `reset_url` is the full frontend URL, e.g.:
    https://your-domain.com/reset-password?token=xxx
    """
    subject = "PSA Property Management - Password Reset"

    # ── Plain-text fallback ───────────────────────────────────────────────────
    plain_body = f"""
Hello,

You have requested to reset your password for the PSA Property Management System.

Click the link below to reset your password (valid for a limited time):

{reset_url}

If you did not request this, please ignore this email. Your password will not change.

Best regards,
PSA Property Management System
"""

    # ── HTML email body ───────────────────────────────────────────────────────
    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#060d1f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060d1f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background-color:#0b1628;border-radius:16px;
                      overflow:hidden;border:1px solid rgba(255,255,255,0.06);
                      box-shadow:0 20px 60px rgba(0,0,0,0.5);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(145deg,#0f2a6e 0%,#0a1f52 50%,#071540 100%);
                       padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                             border-radius:12px;padding:10px 14px;vertical-align:middle;">
                    <span style="font-size:24px;">🏛️</span>
                  </td>
                  <td style="padding-left:14px;text-align:left;vertical-align:middle;">
                    <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">PSA</div>
                    <div style="font-size:10px;color:rgba(147,197,253,0.8);letter-spacing:0.12em;
                                text-transform:uppercase;margin-top:2px;">
                      Philippine Statistics Authority
                    </div>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;">
                <div style="display:inline-block;background:rgba(239,68,68,0.15);
                            border:1px solid rgba(239,68,68,0.3);border-radius:8px;
                            padding:5px 14px;font-size:11px;color:#fca5a5;
                            letter-spacing:0.1em;text-transform:uppercase;">
                  Password Reset Request
                </div>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f5f9;">
                Reset your password
              </p>
              <p style="margin:0 0 28px;font-size:13px;color:#475569;line-height:1.7;">
                We received a request to reset the password for your PSA Property Management account.
                Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#1d4ed8,#1e40af);
                             border-radius:12px;
                             box-shadow:0 4px 20px rgba(29,78,216,0.4);">
                    <a href="{reset_url}"
                       style="display:inline-block;padding:14px 40px;
                              font-size:14px;font-weight:600;color:#ffffff;
                              text-decoration:none;letter-spacing:0.03em;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                            border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                      ⏱ &nbsp;This link will expire shortly. If it no longer works,
                      go back to the login page and request a new one.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 6px;font-size:11px;color:#334155;">
                Button not working? Copy and paste this URL into your browser:
              </p>
              <p style="margin:0;font-size:11px;word-break:break-all;">
                <a href="{reset_url}" style="color:#3b82f6;text-decoration:none;">{reset_url}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#1e3a5f;line-height:1.6;">
                If you did not request a password reset, please ignore this email.<br />
                Your password will remain unchanged.
              </p>
              <p style="margin:0;font-size:10px;color:#1e3a5f;">
                &copy; PSA Property Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    # ── Build the message ─────────────────────────────────────────────────────
    msg = MIMEMultipart('alternative')
    msg['From'] = settings.GMAIL_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject

    # Attach plain text first, HTML second (email clients prefer the last part)
    msg.attach(MIMEText(plain_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.GMAIL_EMAIL, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False