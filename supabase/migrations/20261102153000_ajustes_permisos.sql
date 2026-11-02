-- +Humanos · Ajustes después de revisar los avisos de Supabase (get_advisors).

-- 1) Las funciones de permisos no se llaman sin sesión.
--    Postgres da EXECUTE a PUBLIC por defecto: se lo sacamos y lo damos solo a quien está conectado.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.my_company() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.my_company() to authenticated;
-- company_name_available sigue abierta a anon a propósito: el formulario de registro la usa antes de crear la cuenta.
revoke execute on function public.company_name_available(text) from public;
grant execute on function public.company_name_available(text) to anon, authenticated;

-- 2) Índice para la clave foránea created_by
create index if not exists companies_created_by_idx on public.companies (created_by);

-- 3) Una sola política de lectura por rol en company_members
drop policy if exists "admin gestiona miembros" on public.company_members;
create policy "admin agrega miembros" on public.company_members
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin edita miembros" on public.company_members
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin quita miembros" on public.company_members
  for delete to authenticated using ((select public.is_admin()));
