import webpush, { type PushSubscription } from "web-push";
import {
  deletePushSubscription,
  findClientPushSubscriptions,
  findCurrentProfessionalPushSubscription,
  findProfessionalPushSubscriptions,
  type PushSubscriptionRecord
} from "@/lib/push-subscriptions-store";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function hasPushConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  if (!hasPushConfig()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  return true;
}

function normalizeBrazilianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

function toPushSubscription(subscription: PushSubscriptionRecord): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };
}

async function sendToSubscriptions(subscriptions: PushSubscriptionRecord[], payload: PushPayload) {
  if (!subscriptions.length) return { sent: 0, failed: 0, invalid: 0, reason: "no_subscriptions" };

  if (!configureWebPush()) {
    return { sent: 0, failed: subscriptions.length, invalid: 0, reason: "missing_push_config" };
  }

  let sent = 0;
  let failed = 0;
  let invalid = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          toPushSubscription(subscription),
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          invalid += 1;
          await deletePushSubscription(subscription.id);
        }
      }
    })
  );

  return { sent, failed, invalid };
}

export async function sendPushToProfessional({
  estabelecimentoId,
  profissionalId,
  payload
}: {
  estabelecimentoId: string;
  profissionalId: string;
  payload: PushPayload;
}) {
  const subscriptions = await findProfessionalPushSubscriptions({
    estabelecimentoId,
    profissionalId
  });

  return sendToSubscriptions(subscriptions, payload);
}

export async function sendPushToCurrentProfessionalSubscription({
  estabelecimentoId,
  profissionalId,
  accessTokenId,
  endpoint,
  payload
}: {
  estabelecimentoId: string;
  profissionalId: string;
  accessTokenId: string;
  endpoint: string;
  payload: PushPayload;
}) {
  const subscription = await findCurrentProfessionalPushSubscription({
    estabelecimentoId,
    profissionalId,
    accessTokenId,
    endpoint
  });

  if (!subscription) return { sent: false, invalid: true };
  const result = await sendToSubscriptions([subscription], payload);
  return { sent: result.sent === 1, invalid: result.invalid > 0 || result.reason === "no_subscriptions" };
}

export async function sendPushToClient({
  estabelecimentoId,
  clienteTelefone,
  payload
}: {
  estabelecimentoId: string;
  clienteTelefone: string;
  payload: PushPayload;
}) {
  const normalizedPhone = normalizeBrazilianPhone(clienteTelefone);
  const phoneVariants = Array.from(
    new Set([clienteTelefone, normalizedPhone, normalizedPhone.replace(/^55/, "")])
  );

  const subscriptions = await findClientPushSubscriptions({
    estabelecimentoId,
    phoneVariants
  });

  return sendToSubscriptions(subscriptions, payload);
}
