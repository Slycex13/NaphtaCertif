import { writeFile } from 'node:fs/promises'
import { questions } from './questions_200_data.mjs'

const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`
const targetPostsForTheme = () => ['chef-thermique']

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
  sqlJson(targetPostsForTheme(question.themeId)),
].join(', ')).map((row) => `(${row})`).join(',\n')

const sql = `-- N/OPS — remplacement complet de la banque questions\n-- ATTENTION : ce script supprime toutes les lignes de public.questions.\n-- Les résultats de public.attempts ne sont pas supprimés.\n-- Exécuter dans Supabase > SQL Editor.\n\nbegin;\n\ndelete from public.questions;\n\ninsert into public.questions (\n  id, theme_id, status, critical, prompt, choices, correct_index, rationale, source\n) values\n${rows};\n\ndo $$\nbegin\n  if (select count(*) from public.questions) <> 200 then\n    raise exception 'La banque questions doit contenir exactement 200 lignes.';\n  end if;\nend $$;\n\ncommit;\n`

const outputSql = sql.replace('id, theme_id, status, critical, prompt, choices, correct_index, rationale, source\n) values', 'id, theme_id, status, critical, prompt, choices, correct_index, rationale, source, target_posts\n) values')
await writeFile(new URL('./replace_questions_200.sql', import.meta.url), outputSql, 'utf8')
console.log(`Script SQL généré avec ${questions.length} questions.`)
