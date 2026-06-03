type SendWhatsAppMessageParams = {
  to: string | null | undefined;
  message: string;
};

type WhatsAppSendResult = {
  sent: boolean;
  provider?: "evolution" | "meta";
  reason?: string;
};

function normalizeBrazilianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function hasEvolutionConfig() {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE_NAME
  );
}

async function sendEvolutionMessage(
  to: string,
  message: string
): Promise<WhatsAppSendResult> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
  const apiVersion = process.env.EVOLUTION_API_VERSION ?? "v2";

  if (!apiUrl || !apiKey || !instanceName) {
    return { sent: false, provider: "evolution", reason: "missing_config" };
  }

  const normalizedPhone = normalizeBrazilianPhone(to);
  if (normalizedPhone.length < 12) {
    return { sent: false, provider: "evolution", reason: "invalid_phone" };
  }

  const response = await fetch(
    `${normalizeBaseUrl(apiUrl)}/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey
      },
      body: JSON.stringify(
        apiVersion === "v1"
          ? {
              number: normalizedPhone,
              textMessage: { text: message },
              options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
              }
            }
          : {
              number: normalizedPhone,
              text: message,
              delay: 1200,
              linkPreview: false
            }
      )
    }
  );

  if (!response.ok) {
    return {
      sent: false,
      provider: "evolution",
      reason: await response.text()
    };
  }

  return { sent: true, provider: "evolution" };
}

async function sendMetaMessage(to: string, message: string): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { sent: false, provider: "meta", reason: "missing_config" };
  }

  const normalizedPhone = normalizeBrazilianPhone(to);
  if (normalizedPhone.length < 12) {
    return { sent: false, provider: "meta", reason: "invalid_phone" };
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  if (!response.ok) {
    return { sent: false, provider: "meta", reason: await response.text() };
  }

  return { sent: true, provider: "meta" };
}

export async function sendWhatsAppMessage({
  to,
  message
}: SendWhatsAppMessageParams): Promise<WhatsAppSendResult> {
  if (!to) {
    return { sent: false, reason: "missing_recipient" };
  }

  if (process.env.WHATSAPP_PROVIDER === "evolution" || hasEvolutionConfig()) {
    const evolutionResult = await sendEvolutionMessage(to, message);

    if (evolutionResult.sent || process.env.WHATSAPP_PROVIDER === "evolution") {
      return evolutionResult;
    }
  }

  return sendMetaMessage(to, message);
}
