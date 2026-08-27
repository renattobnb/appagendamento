import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from "./reports.ts";
test("normaliza telefones brasileiros sem duplicar o DDI", () => { assert.equal(normalizeWhatsAppNumber("(85) 99999-1234"), "5585999991234"); assert.equal(normalizeWhatsAppNumber("+55 85 99999-1234"), "5585999991234"); });
test("recusa telefone sem DDD ou com tamanho inválido", () => { assert.equal(normalizeWhatsAppNumber("99999-1234"), null); assert.equal(buildWhatsAppUrl("99999-1234", "Olá"), null); });
test("gera link wa.me com mensagem codificada", () => { assert.equal(buildWhatsAppUrl("85999991234", "Olá, João!"), "https://wa.me/5585999991234?text=Ol%C3%A1%2C%20Jo%C3%A3o!"); });
