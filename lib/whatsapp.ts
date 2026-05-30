type SendWhatsAppMessageParams = {
  to: string | null | undefined;
  message: string;
};

function normalizeBrazilianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

export async function sendWhatsAppMessage({ to, message }: SendWhatsAppMessageParams) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;

  if (!to || !phoneNumberId || !accessToken) {
    return { sent: false, reason: "missing_config" };
  }

  const normalizedPhone = normalizeBrazilianPhone(to);
  if (normalizedPhone.length < 12) {
    return { sent: false, reason: "invalid_phone" };
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
    return { sent: false, reason: await response.text() };
  }

  return { sent: true };
}
