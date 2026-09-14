import { NextRequest, NextResponse } from "next/server";
import { mockLogin, createAuthCookieValue, AUTH_COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } }, { status: 400 });
    }
    const user = mockLogin(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }, { status: 401 });
    }
    const cookieValue = createAuthCookieValue(user);
    const res = NextResponse.json({ user, message: "Logged in" });
    res.cookies.set(AUTH_COOKIE_NAME, cookieValue, { httpOnly: true, path: "/", maxAge: 60*60*24 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: { code: "INTERNAL", message: e.message } }, { status: 500 });
  }
}
