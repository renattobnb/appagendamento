"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Notification = Database["public"]["Tables"]["notificacoes_profissionais"]["Row"];

export function ProfessionalNotifications() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((notification) => !notification.lida).length;

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadNotifications() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: professional } = await supabase
        .from("profissionais")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!professional?.id || !mounted) return;

      setProfessionalId(professional.id);

      const { data } = await supabase
        .from("notificacoes_profissionais")
        .select("*")
        .eq("profissional_id", professional.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (mounted) {
        setNotifications((data ?? []) as Notification[]);
      }
    }

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!professionalId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notificacoes-profissional-${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes_profissionais",
          filter: `profissional_id=eq.${professionalId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications((current) => [notification, ...current].slice(0, 5));
          toast.info(notification.titulo, {
            description: notification.mensagem
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId]);

  async function markAllAsRead() {
    if (!professionalId || unreadCount === 0) return;

    const supabase = createClient();
    await supabase
      .from("notificacoes_profissionais")
      .update({ lida: true })
      .eq("profissional_id", professionalId)
      .eq("lida", false);

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, lida: true }))
    );
  }

  return (
    <Button
      aria-label="Notificacoes do profissional"
      className="relative size-10 px-0"
      title={notifications[0]?.mensagem ?? "Notificacoes"}
      variant="ghost"
      onClick={markAllAsRead}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {unreadCount}
        </span>
      )}
    </Button>
  );
}
