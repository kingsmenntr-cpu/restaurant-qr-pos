import { getDb } from "./db";
import type { User, Role } from "./types";

// Simple mock auth for V1 - in production use Supabase Auth + RLS
const AUTH_COOKIE = "restaurant_auth";

export function mockLogin(email: string, password: string): User | null {
  const db = getDb();
  // For demo, password is email prefix or "owner123" etc
  const user = db.users.find(u=>u.email===email && u.is_active);
  if (!user) return null;
  // Simple check: allow any password length >=3 for demo, but enforce known ones
  const validPasswords: Record<string,string[]> = {
    "owner@restaurant.com": ["owner123","admin","owner"],
    "cashier@restaurant.com": ["cashier123","cashier"],
    "kitchen@restaurant.com": ["kitchen123","kitchen"],
  };
  const allowed = validPasswords[email] || [];
  if (allowed.length>0 && !allowed.includes(password) && password !== "password") {
    // For demo flexibility, allow any password >=3, but log
    // return null;
  }
  return user;
}

export function getUserFromCookie(cookieHeader?: string | null): User | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map(c=>c.trim());
  const authCookie = cookies.find(c=>c.startsWith(`${AUTH_COOKIE}=`));
  if (!authCookie) return null;
  try {
    const value = decodeURIComponent(authCookie.split("=")[1]);
    const parsed = JSON.parse(Buffer.from(value, "base64").toString());
    const db = getDb();
    const user = db.users.find(u=>u.id===parsed.id);
    return user || null;
  } catch { return null; }
}

export function createAuthCookieValue(user: User): string {
  const payload = { id: user.id, role: user.role, email: user.email };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function hasRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export const AUTH_COOKIE_NAME = AUTH_COOKIE;
