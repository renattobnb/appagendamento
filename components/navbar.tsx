"use client";

import Link from "next/link";
import { CalendarDays, LayoutDashboard, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadRole() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("tipo_usuario")
        .eq("id", user.id)
        .maybeSingle();

      if (mounted) {
        setIsAdmin(profile?.tipo_usuario === "administrador");
      }
    }

    loadRole();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logoHref = tenantSlug ? `/${tenantSlug}` : "/";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href={logoHref} className="flex items-center gap-2 font-bold">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <CalendarDays size={18} />
          </span>
          Agenda Online
        </Link>
        {tenantSlug && (
          <nav className="hidden items-center gap-2 md:flex">
            <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/${tenantSlug}/agendar`}>
              Agendar
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/${tenantSlug}/cliente`}>
              Agendamentos
            </Link>
            {isAdmin && (
              <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/${tenantSlug}/admin`}>
                Admin
              </Link>
            )}
          </nav>
        )}
        <div className="flex items-center gap-2">
          <Button
            aria-label="Alternar tema"
            variant="ghost"
            className="size-10 px-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" size={18} />
            <Moon className="dark:hidden" size={18} />
          </Button>
          {tenantSlug && isAdmin && (
            <Link className="hidden sm:block" href={`/${tenantSlug}/admin`}>
              <Button>
                <LayoutDashboard size={16} />
                Admin
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

