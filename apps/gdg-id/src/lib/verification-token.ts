import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "gdghau.v1";
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

type VerificationClaims = {
  email: string;
  issuedAt: number;
  expiresAt: number;
};

export type VerificationTokenResult = {
  token: string;
  expiresAt: string;
};

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createVerificationToken(
  email: string,
  secret: string,
  now = Date.now(),
  ttlSeconds = DEFAULT_TTL_SECONDS,
): VerificationTokenResult {
  if (secret.length < 32)
    throw new Error("QR_SIGNING_SECRET must contain at least 32 characters.");
  const claims: VerificationClaims = {
    email: email.trim().toLowerCase(),
    issuedAt: Math.floor(now / 1000),
    expiresAt: Math.floor(now / 1000) + ttlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signPayload(`${TOKEN_PREFIX}.${payload}`, secret);
  return {
    token: `${TOKEN_PREFIX}.${payload}.${signature}`,
    expiresAt: new Date(claims.expiresAt * 1000).toISOString(),
  };
}

export function verifyVerificationToken(
  token: string,
  secret: string,
  now = Date.now(),
): VerificationClaims | null {
  if (secret.length < 32)
    throw new Error("QR_SIGNING_SECRET must contain at least 32 characters.");
  const [namespace, version, payload, signature, extra] = token.split(".");
  if (
    namespace !== "gdghau" ||
    version !== "v1" ||
    !payload ||
    !signature ||
    extra
  )
    return null;

  const expected = signPayload(`${TOKEN_PREFIX}.${payload}`, secret);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !timingSafeEqual(expectedBytes, signatureBytes)
  )
    return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as VerificationClaims;
    if (
      !claims.email ||
      !Number.isInteger(claims.issuedAt) ||
      !Number.isInteger(claims.expiresAt)
    )
      return null;
    if (
      claims.expiresAt <= Math.floor(now / 1000) ||
      claims.issuedAt > Math.floor(now / 1000) + 60
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}
