-- +Humanos · Etapa 1, punto 1: cuentas de empresas y consultoras.
-- Cada cuenta de Supabase Auth pertenece a una empresa o consultora (company_members).
-- La empresa se crea sola al registrarse (trigger sobre auth.users), con el nombre y el tipo que mandó el formulario.

-- ===== Tablas =====
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  type text not null default 'Empresa' check (type in ('Consultora', 'Empresa')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
-- Un nombre por empresa (sin importar mayúsculas ni espacios de más)
create unique index companies_name_unique on public.companies (lower(btrim(name)));

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members (user_id);

-- Administradores de +Humanos (se cargan a mano desde el panel de Supabase)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ===== Funciones de ayuda para los permisos =====
-- security definer: leen las tablas sin pasar por RLS (evita recursión en las políticas)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members m where m.company_id = cid and m.user_id = (select auth.uid()));
$$;

create or replace function public.is_owner(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members m where m.company_id = cid and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- ¿Está libre este nombre? (el formulario de registro avisa antes de crear la cuenta)
create or replace function public.company_name_available(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.companies c where lower(btrim(c.name)) = lower(btrim(p_name)));
$$;

-- La empresa de quien está conectado
create or replace function public.my_company()
returns table (id uuid, name text, type text, role text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.type, m.role
  from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = (select auth.uid())
  order by m.created_at
  limit 1;
$$;

-- ===== Alta automática de la empresa al registrarse =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'company_name', ''));
  v_type text := coalesce(new.raw_user_meta_data ->> 'company_type', 'Empresa');
  v_id uuid;
begin
  if v_name = '' then
    return new; -- cuentas sin empresa (por ejemplo, un admin creado a mano)
  end if;
  if v_type not in ('Consultora', 'Empresa') then
    v_type := 'Empresa';
  end if;
  insert into public.companies (name, type, created_by) values (v_name, v_type, new.id) returning id into v_id;
  insert into public.company_members (company_id, user_id, role) values (v_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Permisos (RLS) =====
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.admins enable row level security;

-- Empresas: el nombre y el tipo son públicos (aparecen en avisos y en "Empresas adheridas")
create policy "empresas visibles para todos" on public.companies
  for select to anon, authenticated using (true);
-- Solo el dueño (o un admin) cambia el nombre o el tipo
create policy "el dueño edita su empresa" on public.companies
  for update to authenticated
  using ((select public.is_owner(id)) or (select public.is_admin()))
  with check ((select public.is_owner(id)) or (select public.is_admin()));
-- Solo un admin borra empresas. Las altas pasan por el registro (trigger).
create policy "admin borra empresas" on public.companies
  for delete to authenticated using ((select public.is_admin()));

-- Miembros: cada uno ve los de su empresa; el admin ve todos
create policy "ver miembros de mi empresa" on public.company_members
  for select to authenticated using ((select public.is_member(company_id)) or (select public.is_admin()));
create policy "admin gestiona miembros" on public.company_members
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Admins: cada uno ve solo su propia fila
create policy "ver mi fila de admin" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Funciones expuestas al sitio
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.company_name_available(text) to anon, authenticated;
grant execute on function public.my_company() to authenticated;
grant execute on function public.is_admin() to authenticated;
