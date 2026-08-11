import { jwtVerify, SignJWT } from "jose";

const getSecret = () => {
  return new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET_LS || "fallback_secret_change_me_in_prod"
  );
};

export interface JwtPayload {
  adminId: string;
  role: string;
  [key: string]: any;
}

/**
 * Signs a new JWT token using jose (Edge-compatible).
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  const expiresInSec = parseInt(
    process.env.JWT_ACCESS_EXPIRES_IN_SEC_LS || "900"
  );
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSec}s`)
    .sign(getSecret());
    
  return token;
}

/**
 * Verifies a JWT token and returns the payload.
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as JwtPayload;
  } catch (error) {
    // Return null if token is invalid or expired
    return null;
  }
}
