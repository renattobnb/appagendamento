"use client";

import { Bell, BellOff, BellRing, ChevronRight, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = { estabelecimentoId?: string; tipoDestinatario?: "cliente" | "profissional"; profissionalId?: string; clienteTelefone?: string | null; secureProfessionalAccess?: boolean; compactWhenGranted?: boolean };
type DeviceState = "checking" | "active" | "inactive" | "default" | "blocked" | "unsupported";

function toUint8(base64String: string) {
  const base64 = (base64String + "=".repeat((4 - (base64String.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function json(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) as { error?: string; active?: boolean; invalid?: boolean } : null; }
  catch { return { error: text }; }
}

async function registration() {
  const current = await navigator.serviceWorker.getRegistration("/");
  const value = current ?? await navigator.serviceWorker.register("/sw.js");
  if (value.active) return value;
  return Promise.race([navigator.serviceWorker.ready, new Promise<ServiceWorkerRegistration>((_, reject) => window.setTimeout(() => reject(new Error("O service worker não ficou pronto. Atualize a página e tente novamente.")), 8000))]);
}

function supported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
function iosWithoutPwa() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone;
}

export function PushSubscriptionManager({ estabelecimentoId, tipoDestinatario, profissionalId, clienteTelefone, secureProfessionalAccess = false, compactWhenGranted = false }: Props) {
  const [state, setState] = useState<DeviceState>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [loading, setLoading] = useState<"activate" | "test" | "disable" | null>(null);

  const refresh = useCallback(async () => {
    if (!supported()) { setState("unsupported"); return; }
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission === "denied") { setEndpoint(null); setState("blocked"); return; }
    if (currentPermission === "default") { setEndpoint(null); setState("default"); return; }
    try {
      const subscription = await (await registration()).pushManager.getSubscription();
      if (!subscription?.endpoint) { setEndpoint(null); setState("inactive"); return; }
      setEndpoint(subscription.endpoint);
      if (!secureProfessionalAccess) { setState("active"); return; }
      const response = await fetch("/p/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      const data = await json(response);
      setState(response.ok && data?.active ? "active" : "inactive");
    } catch { setState("inactive"); }
  }, [secureProfessionalAccess]);

  useEffect(() => {
    void refresh();
    const revalidate = () => void refresh();
    const visibility = () => { if (document.visibilityState === "visible") revalidate(); };
    window.addEventListener("focus", revalidate); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", visibility); };
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) setOpen(false); };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, [loading, open]);

  async function activate() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!supported() || !publicKey) { toast.error("Notificações push não estão disponíveis neste navegador."); return; }
    const recipient = secureProfessionalAccess ? "profissional" : tipoDestinatario;
    const phone = recipient === "cliente" ? clienteTelefone || localStorage.getItem("agenda_cliente_whatsapp") : null;
    if (recipient === "cliente" && !phone) { toast.error("Informe seu WhatsApp antes de ativar notificações."); return; }
    if (!secureProfessionalAccess && recipient === "profissional" && !profissionalId) { toast.error("Profissional não identificado para notificações."); return; }
    setLoading("activate");
    try {
      const nextPermission = permission === "default" ? await Notification.requestPermission() : Notification.permission;
      setPermission(nextPermission);
      if (nextPermission !== "granted") { setState(nextPermission === "denied" ? "blocked" : "default"); return; }
      const worker = await registration();
      const subscription = await worker.pushManager.getSubscription() ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) throw new Error("O navegador não retornou uma inscrição push válida.");
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(secureProfessionalAccess ? { secure_professional_access: true } : { estabelecimento_id: estabelecimentoId, tipo_destinatario: recipient, profissional_id: recipient === "profissional" ? profissionalId : null, cliente_telefone: recipient === "cliente" ? phone : null }), subscription: serialized }) });
      const data = await json(response);
      if (!response.ok) throw new Error(data?.error || "Não foi possível ativar notificações.");
      setEndpoint(serialized.endpoint); setState("active"); toast.success("Notificações ativadas neste dispositivo.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao ativar notificações."); }
    finally { setLoading(null); }
  }

  async function deactivate() {
    if (!endpoint) return;
    setLoading("disable");
    let revokedOnServer = false;
    try {
      if (secureProfessionalAccess) {
        const response = await fetch("/p/api/push/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
        const data = await json(response);
        if (!response.ok) throw new Error(data?.error || "Não foi possível desativar notificações.");
        revokedOnServer = true;
      }
      const subscription = await (await registration()).pushManager.getSubscription();
      if (subscription?.endpoint === endpoint) await subscription.unsubscribe();
      setEndpoint(null); setState("inactive"); setConfirmDisable(false); toast.success("Notificações desativadas neste dispositivo.");
    } catch (error) {
      if (revokedOnServer) {
        setEndpoint(null); setState("inactive"); setConfirmDisable(false);
        toast.success("Notificações desativadas neste dispositivo.");
      } else {
        toast.error(error instanceof Error ? error.message : "Não foi possível desativar notificações.");
      }
    }
    finally { setLoading(null); }
  }

  async function test() {
    if (!endpoint || !secureProfessionalAccess) return;
    setLoading("test");
    try {
      const response = await fetch("/p/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
      const data = await json(response);
      if (data?.invalid) { setState("inactive"); toast.error("As notificações precisam ser reativadas neste dispositivo."); return; }
      if (!response.ok) throw new Error(data?.error || "Não foi possível enviar a notificação de teste.");
      toast.success("Notificação de teste enviada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar a notificação de teste."); }
    finally { setLoading(null); }
  }

  const label = state === "active" ? "Notificações ativadas" : state === "inactive" ? "Notificações desativadas" : state === "default" ? "Ativar notificações" : state === "blocked" ? "Notificações bloqueadas" : state === "unsupported" ? "Notificações indisponíveis" : "Verificando notificações...";
  const Icon = state === "blocked" ? BellOff : state === "active" ? BellRing : Bell;
  const description = state === "active" ? "Você receberá avisos quando novos agendamentos forem criados." : state === "inactive" ? "As notificações estão desativadas neste dispositivo." : state === "default" ? "Ative os avisos para ser informado mesmo com a agenda fechada." : state === "blocked" ? "As notificações estão bloqueadas neste navegador. Altere a permissão nas configurações do site ou do navegador." : state === "unsupported" ? iosWithoutPwa() ? "Para receber notificações neste dispositivo, adicione a Agenda Online à Tela de Início." : "Este navegador não oferece suporte às notificações da agenda." : "Verificando o service worker e a inscrição deste dispositivo.";
  const trigger = compactWhenGranted ? <button type="button" onClick={() => setOpen(true)} disabled={state === "checking"} className="flex min-h-11 w-full items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70">{state === "checking" ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} className={state === "active" ? "text-primary" : undefined} />}<span>{label}</span><ChevronRight size={17} className="ml-auto" /></button> : <div className="rounded-lg border px-3 py-3"><p className="text-sm font-semibold">Receba avisos de novos agendamentos</p><p className="mt-1 text-sm text-muted-foreground">Ative as notificações para ser avisado mesmo quando a agenda estiver fechada.</p><Button type="button" variant={state === "active" ? "secondary" : "ghost"} className="mt-3 w-full sm:w-auto" disabled={state === "checking" || loading === "activate" || state === "unsupported" || state === "blocked"} onClick={() => state === "active" ? setOpen(true) : void activate()}>{state === "active" ? <BellRing size={16} /> : <Bell size={16} />}{loading === "activate" ? "Ativando..." : label}</Button></div>;

  return <>{trigger}{open && <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="push-manager-title" className="w-full rounded-t-2xl bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl sm:max-w-md sm:rounded-xl sm:p-5"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" /><div className="flex items-start justify-between gap-3"><h2 id="push-manager-title" className="text-lg font-bold">Notificações</h2><Button type="button" variant="ghost" className="size-11 shrink-0 px-0" aria-label="Fechar" disabled={Boolean(loading)} onClick={() => setOpen(false)}><X size={18}/></Button></div>{confirmDisable ? <div className="mt-4"><p className="font-semibold">Desativar notificações?</p><p className="mt-1 text-sm text-muted-foreground">Você deixará de receber avisos de novos agendamentos neste dispositivo.</p><div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" variant="secondary" disabled={loading === "disable"} onClick={() => setConfirmDisable(false)}>Voltar</Button><Button type="button" variant="danger" disabled={loading === "disable"} onClick={() => void deactivate()}>{loading === "disable" ? "Desativando..." : "Desativar"}</Button></div></div> : <div className="mt-4"><div className="rounded-lg bg-muted/60 p-3"><p className="flex items-center gap-2 font-semibold"><Icon size={18} className={state === "active" ? "text-primary" : undefined} />{state === "active" ? "Ativadas neste dispositivo" : label}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{state === "active" && secureProfessionalAccess && <Button type="button" variant="secondary" className="mt-4 min-h-11 w-full" disabled={loading === "test"} onClick={() => void test()}>{loading === "test" ? "Enviando teste..." : "Enviar notificação de teste"}</Button>}{(state === "inactive" || state === "default") && <Button type="button" className="mt-4 min-h-11 w-full" disabled={loading === "activate"} onClick={() => void activate()}>{loading === "activate" ? "Ativando..." : state === "inactive" ? "Reativar notificações" : "Ativar notificações"}</Button>}{state === "active" && <Button type="button" variant="danger" className="mt-3 min-h-11 w-full" disabled={Boolean(loading)} onClick={() => setConfirmDisable(true)}>Desativar neste dispositivo</Button>}</div>}</section></div>}</>;
}
