-- Financeiro / Fase 6: ajuste de grants da view de resumo de conciliacao.

revoke all on table public.fin_conciliacao_resumo from anon;
revoke all on table public.fin_conciliacao_resumo from authenticated;
grant select on table public.fin_conciliacao_resumo to authenticated;
