-- Correctif ciblage : les 200 questions historiques EXP-U-15 restent
-- exclusivement dans le questionnaire Chef de poste thermique.
-- Les questions NC-... ne sont pas modifiées.

begin;

alter table public.questions add column if not exists target_posts jsonb not null default '[]'::jsonb;

update public.questions
set target_posts = '["chef-thermique"]'::jsonb,
    updated_at = now()
where id ~ '^Q-[0-9]+$';

do $$
begin
  if exists (
    select 1
    from public.questions
    where id ~ '^Q-[0-9]+$'
      and target_posts <> '["chef-thermique"]'::jsonb
  ) then
    raise exception 'Certaines questions historiques ne sont pas ciblées Chef de poste thermique.';
  end if;
end $$;

commit;
