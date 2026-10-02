update public.recursos_acesso as recurso
set rota = configuracao.rota
from (
  values
    ('painel_ar.gerar_links', '/painel-ar#gerar'),
    ('painel_ar.crm2.automacoes', '/painel-ar/206/automacoes'),
    ('painel_ar.produtos', '/painel-ar#produtos'),
    ('painel_ar.validacoes', '/painel-ar#validacoes/consultar'),
    ('painel_ar.crm', '/painel-ar#crm'),
    ('rh_dp.dashboard', '/rh-dp/dashboard'),
    ('rh_dp.demandas_contabilidade', '/rh-dp/demandas')
) as configuracao(chave, rota)
where recurso.chave = configuracao.chave
  and recurso.rota is distinct from configuracao.rota;
