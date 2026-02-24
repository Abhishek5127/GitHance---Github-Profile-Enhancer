import crypto from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

function normalizePrivateKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Support multiline keys passed via env vars with escaped newlines.
  return raw.replace(/\\n/g, "\n");
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtToken({ appId, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: String(appId),
    })
  );
  const unsigned = `${header}.${payload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const signature = signer.sign(privateKey);
  const signaturePart = signature
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signaturePart}`;
}

export function isGithubAppConfigured() {
  return Boolean(
    String(process.env.GITHUB_APP_ID || "").trim() &&
      normalizePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY)
  );
}

export function assertGithubAppConfiguration() {
  const appId = String(process.env.GITHUB_APP_ID || "").trim();
  const privateKey = normalizePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);

  if (!appId) {
    throw new Error("Missing GitHub App configuration: GITHUB_APP_ID");
  }
  if (!privateKey) {
    throw new Error("Missing GitHub App configuration: GITHUB_APP_PRIVATE_KEY");
  }

  return {
    appId,
    privateKey,
  };
}

export function createGithubAppJwt() {
  const config = assertGithubAppConfiguration();
  return signJwtToken(config);
}

export async function createGithubInstallationToken(installationId) {
  const normalizedInstallationId = Number(installationId);
  if (!Number.isFinite(normalizedInstallationId) || normalizedInstallationId <= 0) {
    throw new Error("Invalid GitHub installation id");
  }

  const jwt = createGithubAppJwt();
  const response = await fetch(
    `${GITHUB_API}/app/installations/${Math.floor(
      normalizedInstallationId
    )}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.token) {
    const reason = String(payload?.message || "Failed to create installation token");
    throw new Error(reason);
  }

  return {
    token: String(payload.token),
    expires_at: String(payload.expires_at || ""),
    permissions: payload.permissions || {},
  };
}
