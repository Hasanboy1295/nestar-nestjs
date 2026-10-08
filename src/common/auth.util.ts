import { HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const AUTH_COOKIE = "nestar_token";
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string;
  memberNick: string;
  memberEmail: string | null;
  memberType: string;
  memberFullName?: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SECRET_TOKEN;
  if (!secret) {
    throw new Error("Missing SECRET_TOKEN environment variable");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(
  password: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifyToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify<TokenPayload>(token, secretKey());
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TOKEN_MAX_AGE,
};

export function getToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === AUTH_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function requirePayload(req: Request): Promise<TokenPayload> {
  const token = getToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) {
    throw new HttpException(
      { ok: false, error: "Not authenticated" },
      HttpStatus.UNAUTHORIZED,
    );
  }
  return payload;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, authCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.cookie(AUTH_COOKIE, "", { ...authCookieOptions, maxAge: 0 });
}
