import { NextRequest, NextResponse } from "next/server";
import { PROFESSIONAL_ACCESS_COOKIE } from "@/lib/professional-access";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/p/acesso-invalido", request.url), 303);
  response.cookies.set(PROFESSIONAL_ACCESS_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/p" });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
