-- Create favourites table for user favourites persistence
create table if not exists favourites (
  id          serial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id   text not null,
  created_at  timestamptz default now(),
  unique(user_id, entity_type, entity_id)
);

alter table favourites enable row level security;

create policy "favourites_select_own"
on favourites for select
using (auth.uid() = user_id);

create policy "favourites_insert_own"
on favourites for insert
with check (auth.uid() = user_id);

create policy "favourites_delete_own"
on favourites for delete
using (auth.uid() = user_id);