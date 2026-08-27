export function isTenantAdministrator(
  profile: { tipo_usuario: string; estabelecimento_id: string | null } | null,
  establishmentId: string
) {
  return profile?.tipo_usuario === "administrador" && profile.estabelecimento_id === establishmentId;
}
