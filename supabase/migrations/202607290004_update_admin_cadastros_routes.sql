update public.recursos_acesso
set rota = '/admin/cadastros/usuarios',
    updated_at = now()
where chave = 'admin.usuarios'
  and rota is distinct from '/admin/cadastros/usuarios';

update public.recursos_acesso
set rota = '/admin/cadastros/perfis',
    updated_at = now()
where chave = 'admin.perfis'
  and rota is distinct from '/admin/cadastros/perfis';
