"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PushSubscriptionManagerProps = {
  estabelecimentoId?: string;
  tipoDestinatario?: "cliente" | "profissional";
  profissionalId?: string;
  clienteTelefone?: string | null;
  secureProfessionalAccess?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getClientPhone(clienteTelefone?: string | null) {
  if (clienteTelefone) return clienteTelefone;
  return localStorage.getItem("agenda_cliente_whatsapp");
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as { error?: string; ok?: boolean };
  } catch {
    return { error: text };
  }
}

async function getServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration("/");
  const registration =
    existingRegistration ?? (await navigator.serviceWorker.register("/sw.js"));

  if (registration.active) {
    return registration;
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) =>
      window.setTimeout(
        () => reject(new Error("Service worker nao ficou pronto. Atualize a pagina e tente novamente.")),
        8000
      )
    )
  ]);
}

export function PushSubscriptionManager({
  estabelecimentoId,
  tipoDestinatario,
  profissionalId,
  clienteTelefone,
  secureProfessionalAccess = false
}: PushSubscriptionManagerProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function activatePush() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!supported || !publicKey) {
      toast.error("Notificacoes push nao estao disponiveis neste navegador.");
      return;
    }

    const recipientType = secureProfessionalAccess ? "profissional" : tipoDestinatario;
    const phone = recipientType === "cliente" ? getClientPhone(clienteTelefone) : null;
    if (recipientType === "cliente" && !phone) {
      toast.error("Informe seu WhatsApp antes de ativar notificacoes.");
      return;
    }

    if (!secureProfessionalAccess && recipientType === "profissional" && !profissionalId) {
      toast.error("Profissional nao identificado para notificacoes.");
      return;
    }

    setLoading(true);

    try {
      const nextPermission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;

      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        toast.error("Permissao de notificacao nao liberada.");
        return;
      }

      const registration = await getServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));
      const serializedSubscription = subscription.toJSON();

      if (!serializedSubscription.endpoint || !serializedSubscription.keys?.p256dh || !serializedSubscription.keys?.auth) {
        toast.error("O navegador nao retornou uma inscricao push valida.");
        return;
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(secureProfessionalAccess ? { secure_professional_access: true } : {
            estabelecimento_id: estabelecimentoId,
            tipo_destinatario: recipientType,
            profissional_id: recipientType === "profissional" ? profissionalId : null,
            cliente_telefone: recipientType === "cliente" ? phone : null
          }),
          subscription: serializedSubscription
        })
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        toast.error(payload?.error ?? "Nao foi possivel ativar notificacoes.");
        return;
      }

      toast.success("Notificacoes ativadas neste dispositivo.");
      setPermission("granted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao ativar notificacoes.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">Notificações não são suportadas neste navegador.</p>;

  if (permission === "denied") return <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">Permissão bloqueada. Ative as notificações nas configurações do navegador.</p>;

  return (
    <div className="rounded-lg border px-3 py-3">
      <p className="text-sm font-semibold">Receba avisos de novos agendamentos</p>
      <p className="mt-1 text-sm text-muted-foreground">Ative as notificações para ser avisado mesmo quando a agenda estiver fechada.</p>
      <Button type="button" variant={permission === "granted" ? "secondary" : "ghost"} className="mt-3 w-full sm:w-auto" disabled={loading} onClick={activatePush}>
        {permission === "granted" ? <BellRing size={16} /> : <Bell size={16} />}
        {permission === "granted" ? loading ? "Sincronizando..." : "Notificações ativadas" : loading ? "Ativando..." : "Ativar notificações"}
      </Button>
    </div>
  );
}
