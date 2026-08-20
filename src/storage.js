import { createClient } from '@supabase/supabase-js'
import { defaultStore } from './data'

const STORAGE_KEY = 'nops-competences-store-v1'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const backendEnabled = Boolean(supabase)

const toRemoteQuestion = (question) => ({
  id: question.id,
  theme_id: question.themeId,
  status: question.status,
  critical: question.critical,
  prompt: question.prompt,
  choices: question.choices,
  correct_index: question.correctIndex,
  rationale: question.rationale,
  source: question.source,
  target_posts: question.targetPosts || [],
})

const readLocal = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultStore, ...JSON.parse(saved), isDemo: true } : structuredClone(defaultStore)
  } catch {
    return structuredClone(defaultStore)
  }
}

export const saveLocal = (store) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export async function loadStore() {
  const localStore = readLocal()
  if (!supabase) return localStore

  try {
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
    if (questionsError) throw questionsError

    // Les employés peuvent lire les questions publiées mais pas les résultats.
    // Une erreur RLS sur attempts ne doit donc pas faire repasser toute l'application
    // en mode local et masquer la banque distante.
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .order('completed_at', { ascending: false })
    const remoteQuestions = (questions || []).map((question) => ({
      id: question.id, themeId: question.theme_id, status: question.status, critical: question.critical,
      prompt: question.prompt, choices: question.choices, correctIndex: question.correct_index,
      rationale: question.rationale, source: question.source, targetPosts: question.target_posts || [],
    }))
    const remoteAttempts = (attempts || []).map((attempt) => ({
      id: attempt.id, employeeName: attempt.employee_name, team: attempt.team, role: attempt.role,
      mode: attempt.mode, score: attempt.score, questionCount: attempt.question_count,
      overconfidence: attempt.overconfidence, criticalFailures: attempt.critical_failures,
      themeIds: attempt.theme_ids || [], postProfileId: attempt.post_profile_id || '', completedAt: attempt.completed_at, answers: attempt.answers || [],
    }))
    return { questions: remoteQuestions.length ? remoteQuestions : localStore.questions, attempts: attemptsError ? [] : remoteAttempts, isDemo: false }
  } catch (error) {
    console.warn('Supabase indisponible, utilisation du mode local.', error)
    return localStore
  }
}

export async function saveAttempt(attempt, currentStore) {
  const nextStore = { ...currentStore, attempts: [attempt, ...currentStore.attempts], isDemo: currentStore.isDemo }
  saveLocal(nextStore)
  if (supabase) {
    const { error } = await supabase.from('attempts').insert({
      id: attempt.id, employee_name: attempt.employeeName, team: attempt.team, role: attempt.role,
      mode: attempt.mode, score: attempt.score, question_count: attempt.questionCount,
      overconfidence: attempt.overconfidence, critical_failures: attempt.criticalFailures,
      theme_ids: attempt.themeIds, post_profile_id: attempt.postProfileId, completed_at: attempt.completedAt, answers: attempt.answers,
    })
    if (error) console.warn('Résultat conservé localement, synchronisation distante impossible.', error)
  }
  return nextStore
}

export async function saveQuestion(question, currentStore) {
  const exists = currentStore.questions.some((item) => item.id === question.id)
  const nextStore = { ...currentStore, questions: exists ? currentStore.questions.map((item) => item.id === question.id ? question : item) : [question, ...currentStore.questions] }
  saveLocal(nextStore)
  if (supabase) {
    const { error } = await supabase.from('questions').upsert(toRemoteQuestion(question))
    if (error) console.warn('Question conservée localement, synchronisation distante impossible.', error)
  }
  return nextStore
}

export async function seedRemoteQuestions() {
  if (!supabase) return false

  const { data, error } = await supabase.from('questions').select('id').limit(1)
  if (error) throw error
  if (data?.length) return false

  const { error: insertError } = await supabase.from('questions').upsert(defaultStore.questions.map(toRemoteQuestion))
  if (insertError) throw insertError
  return true
}

export function resetLocalStore() {
  window.localStorage.removeItem(STORAGE_KEY)
  return structuredClone(defaultStore)
}
