import test from "node:test";
import assert from "node:assert/strict";
import { isTenantAdministrator } from "./tenant-authorization.ts";

test("administrador so acessa o estabelecimento ao qual esta vinculado", () => {
  const adminBarbearia = { tipo_usuario: "administrador", estabelecimento_id: "barbearia-id" };
  assert.equal(isTenantAdministrator(adminBarbearia, "barbearia-id"), true);
  assert.equal(isTenantAdministrator(adminBarbearia, "padrao-id"), false);
});

test("perfis nao administrativos nunca recebem acesso ao tenant", () => {
  assert.equal(isTenantAdministrator({ tipo_usuario: "admin_master", estabelecimento_id: "padrao-id" }, "padrao-id"), false);
  assert.equal(isTenantAdministrator({ tipo_usuario: "profissional", estabelecimento_id: "barbearia-id" }, "barbearia-id"), false);
});
