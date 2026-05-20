import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { appointment_id: appointmentId } = await request.json();

  // Integrar aqui com WhatsApp API, provedor SMTP e Google Calendar.
  // Esta rota isola a automacao para permitir filas, retries e auditoria.
  console.info("appointment.confirmation.requested", { appointmentId });

  return NextResponse.json({
    ok: true,
    channels: ["email", "whatsapp"],
    appointment_id: appointmentId
  });
}
