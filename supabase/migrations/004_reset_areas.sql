-- LIVAL OS — reset Areas to the five of PRD §6.2.
--
-- Target list: Consulting, VI, Personal Projects, Job Search, Life Admin.
-- Retired:     Build Lab → Personal Projects
--              Home Ops  → Life Admin
--              Learning  → Personal Projects (PRD drops it; folded rather than
--                          deleted so anything filed there survives)
--
-- WHY THIS IS NOT "delete the old rows and insert five new ones":
--
--   workspaces.area_id  references areas on delete CASCADE
--   projects.area_id    references areas on delete RESTRICT
--   tasks.area_id       references areas on delete RESTRICT
--
-- Deleting an area silently deletes every workspace under it. Deleting one that
-- still has projects or tasks raises instead. So this migration renames in place
-- where the target name is free — zero rows move, every foreign key survives —
-- and only repoints children when a genuine merge is needed.
--
-- Idempotent: safe to run twice. Re-running finds the retired names gone and the
-- five targets already correct, and does nothing.
--
-- PREREQUISITE: deploy the S-4 change first (commit bd3d7aa, "stop writing seed
-- data on every login"). Before it, signing in re-inserted the retired areas from
-- the browser and undid this migration.
--
-- SCOPE: this only touches users who already have areas. A brand-new account gets
-- nothing — S-4 removed the browser-side bootstrap that used to create them. That
-- is correct for the one live account this app serves, but if the account is ever
-- recreated, the five areas need inserting by hand or by a follow-up migration.
--
-- VERIFIED against postgres:15-alpine with migrations 001–003 loaded and a fixture
-- covering all three paths (rename, merge-with-children, unrecognised-area). Zero
-- rows lost; every child FK repointed; second run is a no-op.

do $$
declare
  v_user      uuid;
  v_from      text;
  v_to        text;
  v_from_id   uuid;
  v_to_id     uuid;
  v_leftover  text;
begin
  for v_user in select distinct user_id from public.areas loop

    ----------------------------------------------------------------------------
    -- 1. Fold each retired area into its successor.
    ----------------------------------------------------------------------------
    for v_from, v_to in
      select * from (values
        ('Build Lab', 'Personal Projects'),
        ('Home Ops',  'Life Admin'),
        ('Learning',  'Personal Projects')
      ) as pairs(retired, successor)
    loop
      select id into v_from_id
        from public.areas
       where user_id = v_user and name = v_from
       limit 1;

      continue when v_from_id is null;   -- already folded, or never existed

      select id into v_to_id
        from public.areas
       where user_id = v_user and name = v_to
       limit 1;

      if v_to_id is null then
        -- Successor name is free: rename in place. Nothing moves, nothing cascades.
        update public.areas set name = v_to where id = v_from_id;
        raise notice 'areas: renamed % -> % (user %)', v_from, v_to, v_user;
      else
        -- Successor already exists: repoint every child, then drop the empty source.
        update public.workspaces   set area_id           = v_to_id where area_id           = v_from_id;
        update public.projects     set area_id           = v_to_id where area_id           = v_from_id;
        update public.tasks        set area_id           = v_to_id where area_id           = v_from_id;
        update public.time_entries set area_id           = v_to_id where area_id           = v_from_id;
        update public.resources    set area_id           = v_to_id where area_id           = v_from_id;
        update public.inbox_items  set suggested_area_id = v_to_id where suggested_area_id = v_from_id;

        delete from public.areas where id = v_from_id;
        raise notice 'areas: merged % into % (user %)', v_from, v_to, v_user;
      end if;

      v_from_id := null;
      v_to_id   := null;
    end loop;

    ----------------------------------------------------------------------------
    -- 2. Create any of the five that do not exist yet, and normalise all five.
    --    Colours carry over from src/data/seed.ts so nothing visibly changes;
    --    VI takes the teal that Home Ops vacated.
    ----------------------------------------------------------------------------
    insert into public.areas (user_id, name, description, color, sort_order)
    select v_user, t.name, t.description, t.color, t.sort_order
      from (values
        ('Consulting',        'Client delivery work.',                              '#6d5efc', 1),
        ('VI',                'Valentino Intelligence — LLC, SEA, invoices, taxes.', '#0891b2', 2),
        ('Personal Projects', 'LIVAL OS, road-trip, Home Assistant bridge.',        '#2563eb', 3),
        ('Job Search',        'Applications, pipeline, interview prep.',            '#16a34a', 4),
        ('Life Admin',        'Appointments, health, house, bills.',                '#ea580c', 5)
      ) as t(name, description, color, sort_order)
     where not exists (
       select 1 from public.areas a
        where a.user_id = v_user and a.name = t.name
     );

    update public.areas a
       set color      = t.color,
           sort_order = t.sort_order,
           archived_at = null
      from (values
        ('Consulting',        '#6d5efc', 1),
        ('VI',                '#0891b2', 2),
        ('Personal Projects', '#2563eb', 3),
        ('Job Search',        '#16a34a', 4),
        ('Life Admin',        '#ea580c', 5)
      ) as t(name, color, sort_order)
     where a.user_id = v_user
       and a.name = t.name
       and (a.color, a.sort_order) is distinct from (t.color, t.sort_order);

    ----------------------------------------------------------------------------
    -- 3. Report anything left over. NOT deleted — an unrecognised area may hold
    --    real work, and guessing where it belongs is not this migration's call.
    ----------------------------------------------------------------------------
    select string_agg(name, ', ' order by sort_order)
      into v_leftover
      from public.areas
     where user_id = v_user
       and name not in ('Consulting', 'VI', 'Personal Projects', 'Job Search', 'Life Admin');

    if v_leftover is not null then
      raise notice 'areas: % unrecognised area(s) left in place for user %: %',
        (select count(*) from public.areas
          where user_id = v_user
            and name not in ('Consulting','VI','Personal Projects','Job Search','Life Admin')),
        v_user, v_leftover;
      raise notice 'areas: review these by hand — merge or delete them yourself.';
    end if;

  end loop;
end $$;
