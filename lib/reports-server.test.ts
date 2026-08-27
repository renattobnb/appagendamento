import test from "node:test";
import assert from "node:assert/strict";
import { buildReportFallback } from "./reports-server.ts";

const appointment = (id: string, data: string, status: string, phone = "85999991234") => ({ id, cliente_id: null, cliente_nome: id, cliente_telefone: phone, data, hora_fim: "12:00", status, servicos: { nome: "Corte", valor: 40 }, profissionais: { nome: "Ana" } });

test("reativação usa apenas o último atendimento finalizado", () => {
  const original = Intl.DateTimeFormat;
  Intl.DateTimeFormat = class { formatToParts() { return [{ type: "year", value: "2026" }, { type: "month", value: "08" }, { type: "day", value: "27" }]; } } as unknown as typeof Intl.DateTimeFormat;
  try {
    const report = buildReportFallback([appointment("19 dias", "2026-08-08", "finalizado", "85999991231"), appointment("20 dias", "2026-08-07", "finalizado", "85999991232"), appointment("cancelado recente", "2026-08-24", "cancelado", "85999991233"), appointment("cancelado recente", "2026-07-26", "finalizado", "85999991233")], "2026-08-01", "2026-08-27");
    assert.deepEqual(report.inactive_customers.map((item) => item.name), ["cancelado recente", "20 dias"]);
  } finally { Intl.DateTimeFormat = original; }
});
