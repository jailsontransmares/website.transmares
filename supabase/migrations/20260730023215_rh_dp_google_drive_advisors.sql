-- Ajustes de segurança e desempenho identificados pelos Advisors após a Fase 6.

create index if not exists rh_arquivos_versoes_enviado_por_idx
  on public.rh_arquivos_colaboradores_versoes (enviado_por);

create index if not exists rh_drive_operacoes_usuario_created_idx
  on public.rh_drive_operacoes (usuario_id, created_at desc);

-- A tabela de pastas é interna da Edge Function. A política explícita mantém
-- bloqueio total no Data API e evita que a ausência de política passe despercebida.
drop policy if exists rh_drive_pastas_no_direct_access on public.rh_drive_pastas;
create policy rh_drive_pastas_no_direct_access
on public.rh_drive_pastas for select to authenticated
using (false);
;
