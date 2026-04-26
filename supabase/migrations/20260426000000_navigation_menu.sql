create extension if not exists "uuid-ossp";

create table if not exists public.navigation_menu (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text,
    parent_id uuid references public.navigation_menu(id) on delete set null,
    order_index integer not null default 0,
    is_active boolean not null default true,
    is_cta boolean not null default false,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.navigation_menu
    add column if not exists is_cta boolean not null default false;

alter table public.navigation_menu
    add column if not exists updated_at timestamp with time zone not null default now();

create index if not exists navigation_menu_parent_id_idx
    on public.navigation_menu(parent_id);

create index if not exists navigation_menu_active_order_idx
    on public.navigation_menu(is_active, order_index);

insert into public.navigation_menu (name, slug, parent_id, order_index, is_active)
select item.name, item.slug, null, item.order_index, true
from (
    values
        ('Home', '/', 0),
        ('Why Join', '/why', 10),
                ('Income', '/income', 20),
                ('Eligibility', '/eligibility', 30),
                ('Blog', '/blog', 40),
                ('Tools', '/tools', 50),
                ('Downloads', '/downloads', 60),
                ('About', '/about', 70),
                ('Contact', '/contact', 80)
) as item(name, slug, order_index)
where not exists (
    select 1
    from public.navigation_menu existing
    where existing.name = item.name
      and existing.parent_id is null
);

update public.navigation_menu
set slug = '/tools', updated_at = now()
where name = 'Tools'
    and parent_id is null
    and (slug is null or slug = '');

insert into public.navigation_menu (name, slug, parent_id, order_index, is_active, is_cta)
select 'Apply Now', '/apply', null, 90, true, true
where not exists (
        select 1
        from public.navigation_menu existing
        where existing.name = 'Apply Now'
            and existing.parent_id is null
);

update public.navigation_menu
set is_cta = true, updated_at = now()
where name = 'Apply Now'
    and parent_id is null;

insert into public.navigation_menu (name, slug, parent_id, order_index, is_active)
select item.name, item.slug, tools.id, item.order_index, true
from public.navigation_menu tools
cross join (
    values
                ('LIC Income Calculator', '/tools/lic-income-calculator', 0),
                ('LIC Commission Calculator', '/tools/lic-commission-calculator', 10)
) as item(name, slug, order_index)
where tools.name = 'Tools'
  and tools.parent_id is null
  and not exists (
      select 1
      from public.navigation_menu existing
      where existing.name = item.name
        and existing.parent_id = tools.id
  );

update public.navigation_menu
set slug = replacements.slug,
    updated_at = now()
from (
    values
        ('LIC Income Calculator', '/tools/lic-income-calculator'),
        ('LIC Commission Calculator', '/tools/lic-commission-calculator')
) as replacements(name, slug)
where public.navigation_menu.name = replacements.name
  and public.navigation_menu.slug is distinct from replacements.slug;
