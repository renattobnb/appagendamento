-- This value is intentionally committed before the policy migration references it.
alter type public.tipo_usuario add value if not exists 'admin_master';
