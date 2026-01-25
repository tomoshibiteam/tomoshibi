-- Add unique constraint to support upsert on purchases user_id + quest_id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchases_user_quest_unique'
  ) then
    alter table public.purchases
      add constraint purchases_user_quest_unique unique (user_id, quest_id);
  end if;
end$$;
