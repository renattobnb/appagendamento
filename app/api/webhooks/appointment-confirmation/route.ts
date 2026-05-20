import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  // Integrar aqui com WhatsApp API, provedor SMTP e Google Calendar.
  // Esta rota isola a automacao para permitir filas, retries e auditoria.
  console.info("appointment.confirmation.requested", payload);

  return NextResponse.json({
    ok: true,
    channels: ["email", "whatsapp"],
    payload
  });
}
