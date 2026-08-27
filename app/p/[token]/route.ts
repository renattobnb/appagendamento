import { NextRequest, NextResponse } from "next/server";
import { PROFESSIONAL_ACCESS_COOKIE, PROFESSIONAL_ACCESS_MAX_AGE, resolveProfessionalAccess, touchProfessionalAccess } from "@/lib/professional-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await resolveProfessionalAccess(token);
  if (!access) return NextResponse.redirect(new URL("/p/acesso-invalido", request.url));

  await touchProfessionalAccess(token, access);
  const response = NextResponse.redirect(new URL("/p", request.url));
  response.cookies.set(PROFESSIONAL_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PROFESSIONAL_ACCESS_MAX_AGE,
    path: "/p"
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
