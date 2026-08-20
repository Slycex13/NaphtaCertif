import { writeFile } from 'node:fs/promises'
import { questions } from './post_questionnaires_data.mjs'

const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`

const rows = questions.map((question) => [
  sqlText(question.id),
  sqlText(question.themeId),
  sqlText(question.status),
  question.critical ? 'true' : 'false',
  sqlText(question.prompt),
  sqlJson(question.choices),
  question.correctIndex,
  sqlText(question.rationale),
  sqlText(question.source),
  sqlJson(question.targetPosts),
].join(', ')).map((row) => `(${row})`).join(',\n')

const sql = `-- N/OPS — ajout des questionnaires par poste
-- Ce script conserve les questions et les résultats existants.
-- Les 100 nouvelles questions sont publiées mais doivent être relues par le référent
-- HSE / exploitation avant un usage d'habilitation ou de validation d'aptitude.

begin;

alter table public.questions add column if not exists target_posts jsonb not null default '[]'::jsonb;
alter table public.attempts add column if not exists post_profile_id text not null default 'operateur';

-- Les 200 questions historiques proviennent du référentiel gaz/combustibles : elles restent
-- dans le questionnaire Chef de poste thermique uniquement.
update public.questions
set target_posts = case
  when id ~ '^Q-[0-9]+$' then '["chef-thermique"]'::jsonb
  else target_posts
end
where id ~ '^Q-[0-9]+$';

insert into public.questions (
  id, theme_id, status, critical, prompt, choices, correct_index, rationale, source, target_posts
) values
${rows}
on conflict (id) do update set
  theme_id = excluded.theme_id,
  status = excluded.status,
  critical = excluded.critical,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_index = excluded.correct_index,
  rationale = excluded.rationale,
  source = excluded.source,
  target_posts = excluded.target_posts,
  updated_at = now();

create index if not exists questions_target_posts_gin_idx on public.questions using gin (target_posts);

do $$
begin
  if (select count(*) from public.questions where id like 'NC-%') <> 100 then
    raise exception 'Les questionnaires par poste doivent contenir exactement 100 questions NC.';
  end if;
end $$;

commit;
`

await writeFile(new URL('./role_questionnaires.sql', import.meta.url), sql, 'utf8')
console.log(`Script SQL généré avec ${questions.length} questions par poste.`)
