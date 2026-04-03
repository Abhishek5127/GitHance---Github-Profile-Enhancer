const RESEND_API_URL = "https://api.resend.com/emails";

function buildSubject(purpose) {
  return purpose === "signup"
    ? "Verify your GitHance account"
    : "Your GitHance sign-in code";
}

function buildHtml({ code, purpose }) {
  const intro =
    purpose === "signup"
      ? "Use this one-time code to finish creating your GitHance account."
      : "Use this one-time code to finish signing in to GitHance.";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin-bottom:12px;">GitHance verification code</h2>
      <p style="margin-bottom:16px;">${intro}</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:20px 0;">${code}</div>
      <p style="margin:0;">This code expires in 10 minutes.</p>
    </div>
  `;
}

export async function sendOtpEmail({ email, code, purpose }) {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(
    process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || ""
  ).trim();

  if (resendApiKey && fromEmail) {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: buildSubject(purpose),
        html: buildHtml({ code, purpose }),
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload?.message || payload?.error?.message || "Failed to send OTP email"
      );
    }

    return {
      delivered: true,
      provider: "resend",
      debugCode: "",
    };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[GitHance OTP] ${purpose} ${email} ${code}`);
    return {
      delivered: false,
      provider: "console",
      debugCode: code,
    };
  }

  throw new Error("Email delivery is not configured");
}
