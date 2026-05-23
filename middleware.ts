import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasSupabaseEnv } from "@/lib/config";

// Rotas que, quando acessadas sem prefixo de tenant, devem redirecionar para o tenant padrão
const LEGACY_ROUTES = ["agendar", "admin", "cliente", "login", "cadastro", "recuperar-senha"];

// Slug do tenant padrão para redirecionamentos de rotas legadas
const DEFAULT_TENANT = "padrao";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  // Redireciona rotas legadas (sem slug de tenant) para o tenant padrão
  if (LEGACY_ROUTES.includes(firstSegment)) {
    const newUrl = request.nextUrl.clone();
    newUrl.pathname = `/${DEFAULT_TENANT}${pathname}`;
    return NextResponse.redirect(newUrl);
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const tenantSlug = segments[0];
  const subRoute = segments[1];

  const isProtected = ["admin", "cliente", "agendar"].includes(subRoute);
  const hasGuestAccess = Boolean(request.cookies.get("agenda_guest")?.value);

  if (isProtected && !user && !hasGuestAccess) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${tenantSlug}/login`;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (subRoute === "admin" && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("tipo_usuario, estabelecimento_id")
      .eq("id", user.id)
      .maybeSingle();

    let hasAccess = false;
    if (profile?.tipo_usuario === "administrador") {
      const { data: establishment } = await supabase
        .from("estabelecimentos")
        .select("id")
        .eq("slug", tenantSlug)
        .maybeSingle();

      if (establishment && profile.estabelecimento_id === establishment.id) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/cliente`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
