import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleHelp,
  CircleUserRound, Download, Edit3, Flame, GitBranch, LayoutDashboard, ListChecks, LogOut,
  Menu, MoreHorizontal, Plus, RotateCcw, Search, Settings2, Shield, SlidersHorizontal,
  Sparkles, Target, Thermometer, Trash2, TrendingUp, UserRound, Users, Wind, X, Zap,
} from 'lucide-react'
import { allPostProfileIds, getPostProfile, getTheme, defaultStore, postProfiles, questionMatchesPost, themes } from './data'
import { backendEnabled, loadStore, resetLocalStore, saveAttempt, saveQuestion, seedRemoteQuestions, supabase } from './storage'
import './styles.css'

const iconMap = { activity: Activity, wind: Wind, flame: Flame, 'git-branch': GitBranch, thermometer: Thermometer, shield: Shield, zap: Zap }
const initials = (name = '') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
const formatTime = (date) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
const scoreTone = (score) => score >= 80 ? 'good' : score >= 65 ? 'warn' : 'bad'
const makeId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`

function Icon({ name, size = 18, ...props }) {
  const Component = iconMap[name] || Activity
  return <Component size={size} strokeWidth={1.8} {...props} />
}

function App() {
  const [store, setStore] = useState(null)
  const [role, setRole] = useState('employee')
  const [screen, setScreen] = useState('employee')
  const [mobileNav, setMobileNav] = useState(false)
  const [adminGate, setAdminGate] = useState(false)
  const [questionEditor, setQuestionEditor] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [report, setReport] = useState(null)
  const [toast, setToast] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionConfig, setSessionConfig] = useState({
    name: '', team: 'Équipe 1', role: 'Opérateur', mode: 'Évaluation', count: 8,
    themeIds: themes.map((theme) => theme.id), postProfileId: 'operateur',
  })

  const refreshStore = async () => {
    setIsLoading(true)
    const next = await loadStore()
    setStore(next)
    setIsLoading(false)
  }

  useEffect(() => { refreshStore() }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  const notify = (message, tone = 'info') => setToast({ message, tone })

  const enterAdmin = async () => {
    setAdminGate(false)
    setRole('admin')
    setScreen('overview')
    setMobileNav(false)
    if (backendEnabled) {
      try {
        const seeded = await seedRemoteQuestions()
        await refreshStore()
        if (seeded) notify('La banque initiale a été importée dans Supabase.', 'success')
      } catch (error) {
        console.warn('Import initial Supabase impossible.', error)
        await refreshStore()
        notify('Connexion admin réussie, mais la banque n’a pas pu être importée.', 'error')
      }
    }
  }

  const goTo = (nextScreen) => {
    setScreen(nextScreen)
    setMobileNav(false)
  }

  const startSession = (event) => {
    event.preventDefault()
    if (!sessionConfig.name.trim()) {
      notify('Ajoutez votre prénom et votre nom pour commencer.', 'error')
      return
    }
    const published = store.questions.filter((question) => question.status === 'published')
    const pool = published.length ? published : store.questions
    const postPool = pool.filter((question) => questionMatchesPost(question, sessionConfig.postProfileId))
    const filtered = sessionConfig.themeIds.length ? postPool.filter((question) => sessionConfig.themeIds.includes(question.themeId)) : postPool
    if (!filtered.length) {
      notify('Aucune question disponible pour ce périmètre.', 'error')
      return
    }
    if (!published.length) notify('Les questions sont encore en validation : session de démonstration ouverte.', 'info')
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    const questions = sessionConfig.mode === 'Révision ciblée'
      ? shuffled.sort((a, b) => Number(b.critical) - Number(a.critical)).slice(0, sessionConfig.count)
      : shuffled.slice(0, sessionConfig.count)
    setQuiz({ questions, index: 0, answers: [], selectedIndex: null, confidence: null, feedback: null, startedAt: new Date().toISOString(), config: { ...sessionConfig } })
    goTo('quiz')
  }

  const selectAnswer = (selectedIndex) => setQuiz((current) => ({ ...current, selectedIndex, feedback: null }))
  const selectConfidence = (confidence) => setQuiz((current) => ({ ...current, confidence, feedback: null }))

  const submitAnswer = () => {
    if (quiz.selectedIndex === null || !quiz.confidence) {
      notify('Choisissez une réponse et votre niveau de certitude.', 'error')
      return
    }
    const question = quiz.questions[quiz.index]
    const correct = quiz.selectedIndex === question.correctIndex
    const diagnostic = correct ? 'solide' : quiz.confidence === 'sur' ? 'surconfiance' : 'erreur'
    const answer = { questionId: question.id, selectedIndex: quiz.selectedIndex, correct, confidence: quiz.confidence, diagnostic }
    setQuiz((current) => ({ ...current, answers: [...current.answers, answer], feedback: { correct, diagnostic } }))
  }

  const finishSession = async (finalAnswers) => {
    const questions = quiz.questions
    const correct = finalAnswers.filter((answer) => answer.correct).length
    const overconfidence = finalAnswers.filter((answer) => answer.diagnostic === 'surconfiance').length
    const criticalFailures = finalAnswers.filter((answer, index) => !answer.correct && questions[index]?.critical).length
    const attempt = {
      id: makeId('ATT'), employeeName: quiz.config.name.trim(), team: quiz.config.team, role: quiz.config.role, postProfileId: quiz.config.postProfileId,
      mode: quiz.config.mode, score: Math.round((correct / questions.length) * 100), questionCount: questions.length,
      overconfidence, criticalFailures, themeIds: quiz.config.themeIds, completedAt: new Date().toISOString(), answers: finalAnswers,
    }
    const nextStore = await saveAttempt(attempt, store)
    setStore(nextStore)
    setReport({ ...attempt, questions })
    setQuiz(null)
    goTo('report')
    notify('Session enregistrée. Votre bilan est prêt.', 'success')
  }

  const nextQuestion = () => {
    const nextAnswers = quiz.answers
    if (quiz.index >= quiz.questions.length - 1) {
      finishSession(nextAnswers)
    } else {
      setQuiz((current) => ({ ...current, index: current.index + 1, selectedIndex: null, confidence: null, feedback: null }))
    }
  }

  const onSaveQuestion = async (question) => {
    const nextStore = await saveQuestion(question, store)
    setStore(nextStore)
    setQuestionEditor(null)
    notify(question.status === 'published' ? 'Question publiée dans la banque.' : 'Brouillon enregistré.', 'success')
  }

  const resetDemo = () => {
    if (!window.confirm('Réinitialiser les résultats locaux de démonstration ?')) return
    const nextStore = resetLocalStore()
    setStore(nextStore)
    setReport(null)
    notify('Les données locales ont été réinitialisées.', 'success')
  }

  if (isLoading || !store) return <div className="loading-screen"><div className="loader-mark"><Zap size={22} /></div><span>Initialisation du poste N/OPS…</span></div>

  return (
    <div className="app-shell">
      <Sidebar role={role} screen={screen} mobileNav={mobileNav} onNavigate={goTo} onOpenAdmin={() => setAdminGate(true)} onReset={resetDemo} onClose={() => setMobileNav(false)} />
      <div className="app-main">
        <Topbar role={role} screen={screen} isDemo={store.isDemo} onMenu={() => setMobileNav((current) => !current)} onOpenAdmin={() => setAdminGate(true)} onEmployee={() => { setRole('employee'); goTo('employee') }} />
        <main className="content-area">
          {role === 'employee' && screen === 'employee' && <EmployeeHome config={sessionConfig} setConfig={setSessionConfig} store={store} onStart={startSession} onAdmin={() => setAdminGate(true)} />}
          {role === 'employee' && screen === 'quiz' && quiz && <QuizView quiz={quiz} onSelectAnswer={selectAnswer} onSelectConfidence={selectConfidence} onSubmit={submitAnswer} onNext={nextQuestion} />}
          {role === 'employee' && screen === 'report' && report && <ReportView report={report} onNew={() => goTo('employee')} />}
          {role === 'admin' && screen === 'overview' && <AdminOverview store={store} onNavigate={goTo} />}
          {role === 'admin' && screen === 'results' && <AdminResults store={store} onNotify={notify} />}
          {role === 'admin' && screen === 'bank' && <QuestionBank store={store} onEdit={setQuestionEditor} onNew={() => setQuestionEditor('new')} />}
        </main>
      </div>
      {adminGate && <AdminGate onClose={() => setAdminGate(false)} onEnter={enterAdmin} />}
      {questionEditor && <QuestionEditor question={questionEditor === 'new' ? null : questionEditor} onClose={() => setQuestionEditor(null)} onSave={onSaveQuestion} />}
      {toast && <div className={`toast toast-${toast.tone}`}><span className="toast-dot" />{toast.message}<button onClick={() => setToast(null)} aria-label="Fermer"><X size={16} /></button></div>}
    </div>
  )
}

function Sidebar({ role, screen, mobileNav, onNavigate, onOpenAdmin, onReset, onClose }) {
  const adminLinks = [
    { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'results', label: 'Résultats', icon: BarChart3 },
    { id: 'bank', label: 'Banque de questions', icon: ListChecks },
  ]
  return <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
    <div className="brand-row"><div className="brand-symbol"><span /><span /><span /></div><div><div className="brand-name">NAPHTA</div><div className="brand-subtitle">N/OPS · LAVÉRA</div></div><button className="mobile-close" onClick={onClose} aria-label="Fermer le menu"><X size={17} /></button></div>
    <div className="rail-status"><span className="live-dot" /><span>Plateforme active</span><span className="status-time">LIVE</span></div>
    {role === 'employee' ? <>
      <div className="nav-section-label">Mon espace</div>
      <button className={`nav-item ${screen === 'employee' ? 'active' : ''}`} onClick={() => onNavigate('employee')}><UserRound size={17} />Mon parcours<span className="nav-count">01</span></button>
      {screen === 'report' && <button className="nav-item active" onClick={() => onNavigate('report')}><Target size={17} />Mon dernier bilan</button>}
      <div className="sidebar-tip"><Sparkles size={15} /><div><strong>Rituel de quart</strong><span>10 min pour garder les automatismes nets.</span></div></div>
      <button className="admin-entry" onClick={onOpenAdmin}><Settings2 size={16} />Ouvrir le pilotage admin<ArrowRight size={15} /></button>
    </> : <>
      <div className="nav-section-label">Pilotage</div>
      {adminLinks.map(({ id, label, icon: NavIcon }) => <button key={id} className={`nav-item ${screen === id ? 'active' : ''}`} onClick={() => onNavigate(id)}><NavIcon size={17} />{label}{id === 'results' && <span className="nav-count">{screen === 'results' ? '04' : '•'}</span>}</button>)}
      <div className="sidebar-divider" />
      <button className="nav-item muted" onClick={() => onNavigate('employee')}><ArrowLeft size={17} />Vue employé</button>
      <div className="sidebar-tip admin-tip"><Shield size={15} /><div><strong>Mode pilotage</strong><span>Les changements de banque sont tracés localement.</span></div></div>
      <button className="admin-entry subtle" onClick={onReset}><RotateCcw size={15} />Réinitialiser la démo</button>
    </>}
    <div className="sidebar-footer"><div className="avatar small">ND</div><div><strong>Naphta / Utilities</strong><span>Version 0.1 • France</span></div><MoreHorizontal size={17} /></div>
  </aside>
}

function Topbar({ role, screen, isDemo, onMenu, onOpenAdmin, onEmployee }) {
  const title = role === 'admin' ? ({ overview: 'Vue d’ensemble', results: 'Suivi des résultats', bank: 'Banque de questions' }[screen] || 'Pilotage') : screen === 'quiz' ? 'Session en cours' : screen === 'report' ? 'Bilan de session' : 'Mon parcours'
  return <header className="topbar"><button className="menu-button" onClick={onMenu} aria-label="Ouvrir le menu"><Menu size={20} /></button><div className="breadcrumbs"><span>N/OPS</span><span className="crumb-slash">/</span><strong>{title}</strong></div><div className="topbar-actions"><div className="sync-state"><span className="sync-icon"><Activity size={14} /></span><span>{isDemo ? 'Données locales' : 'Synchronisé'}</span></div><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>{role === 'employee' ? <button className="role-switch" onClick={onOpenAdmin}><span className="avatar mini">AD</span><span>Admin</span><ChevronDown size={14} /></button> : <button className="role-switch" onClick={onEmployee}><span className="avatar mini lime">ND</span><span>Employé</span><ChevronDown size={14} /></button>}</div></header>
}

function EmployeeHome({ config, setConfig, store, onStart, onAdmin }) {
  const selectedProfile = getPostProfile(config.postProfileId)
  const published = store.questions.filter((question) => question.status === 'published')
  const availablePool = (published.length ? published : store.questions).filter((question) => questionMatchesPost(question, config.postProfileId))
  const availableCount = availablePool.length
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))
  const chooseProfile = (profileId) => {
    const profile = getPostProfile(profileId)
    setConfig((current) => ({ ...current, postProfileId: profile.id, role: profile.label }))
  }
  const toggleTheme = (themeId) => setConfig((current) => ({ ...current, themeIds: current.themeIds.includes(themeId) ? current.themeIds.filter((id) => id !== themeId) : [...current.themeIds, themeId] }))
  return <div className="employee-page page-enter">
    <section className="hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" />Rafraîchissement technique continu</div>
        <h1>Les bons réflexes<br /><em>se construisent</em><br />en situation.</h1>
        <p className="hero-description">Une session courte, contextualisée et utile pour garder les gestes d’exploitation présents quand la pression monte.</p>
        <div className="hero-meta"><span><span className="pulse-ring" />Session recommandée</span><span className="meta-separator" />8 questions · 10 min</div>
      </div>
      <div className="hero-signal"><div className="signal-orbit orbit-one" /><div className="signal-orbit orbit-two" /><div className="signal-center"><div className="signal-number">01</div><span>récurrent</span></div><div className="signal-caption"><span className="mini-label">NIVEAU DE VEILLE</span><strong>Maintenir le signal</strong><span>Les automatismes évoluent avec le terrain.</span></div></div>
    </section>
    <section className="start-layout">
      <div className="section-heading"><div><span className="eyebrow compact"><span className="eyebrow-line" />Lancer une session</span><h2>Quel terrain voulez-vous réactiver ?</h2></div><div className="question-availability"><BookOpen size={16} /><span>{availableCount} questions pour {selectedProfile.label}</span></div></div>
      <form className="session-card" onSubmit={onStart}>
        <div className="form-main">
          <div className="field-label">Type de questionnaire <small>Le poste détermine le périmètre évalué</small></div>
          <div className="post-profile-grid">{postProfiles.map((profile) => <button type="button" key={profile.id} className={`post-profile-option ${config.postProfileId === profile.id ? `selected ${profile.tone}` : ''}`} onClick={() => chooseProfile(profile.id)}><span className={`post-profile-icon ${profile.tone}`}><Icon name={profile.icon} size={16} /></span><span className="post-profile-copy"><strong>{profile.label}</strong><small>{profile.short}</small><em>{profile.description}</em></span>{config.postProfileId === profile.id && <Check size={15} className="post-profile-check" />}</button>)}</div>
          <div className="field-row two"><Field label="Prénom & nom" hint="Visible dans votre bilan"><input value={config.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex. Camille Durand" /></Field><Field label="Équipe"><select value={config.team} onChange={(event) => update('team', event.target.value)}>{['Équipe 1', 'Équipe 2', 'Équipe 3', 'Équipe 4', 'Équipe 5'].map((team) => <option key={team}>{team}</option>)}</select></Field></div>
          <div className="selected-profile-note"><span className={`theme-dot ${selectedProfile.tone}`} /><span><strong>{selectedProfile.label}</strong><small>{selectedProfile.description}</small></span></div>
          <div className="field-label">Mode de travail</div>
          <div className="mode-grid">{[['Évaluation', 'Le score et la correction apparaissent à la fin.', Target], ['Entraînement', 'Un rappel après chaque réponse.', Sparkles], ['Révision ciblée', 'Les situations critiques passent d’abord.', Zap]].map(([label, description, ModeIcon]) => <button type="button" key={label} className={`mode-option ${config.mode === label ? 'selected' : ''}`} onClick={() => update('mode', label)}><span className="mode-icon"><ModeIcon size={16} /></span><span><strong>{label}</strong><small>{description}</small></span>{config.mode === label && <Check size={15} className="mode-check" />}</button>)}</div>
        </div>
        <div className="form-side"><div className="side-label">Périmètre technique</div><div className="theme-selection">{themes.map((theme) => <button type="button" className={`theme-chip ${config.themeIds.includes(theme.id) ? `selected ${theme.tone}` : ''}`} key={theme.id} onClick={() => toggleTheme(theme.id)}><span className="theme-chip-mark"><Icon name={theme.icon} size={14} /></span><span>{theme.short}</span>{config.themeIds.includes(theme.id) && <Check size={13} />}</button>)}</div><div className="side-divider" /><div className="count-row"><div><div className="side-label">Nombre de questions</div><span className="muted-copy">Plus c’est court, plus c’est régulier.</span></div><div className="count-buttons">{[5, 8, 12].map((count) => <button type="button" key={count} className={config.count === count ? 'selected' : ''} onClick={() => update('count', count)}>{count}</button>)}</div></div><button className="primary-button start-button" type="submit">Commencer la session <ArrowRight size={17} /></button><p className="privacy-note"><Shield size={13} />Votre score est visible par le référent habilité.</p></div>
      </form>
      <div className="bottom-notes"><div><span className="note-index">A1</span><span><strong>Référentiel source</strong><small>EXP-U · référentiel FAF · consignes Centrale Sud</small></span></div><div><span className="note-index orange">!</span><span><strong>Certitude obligatoire</strong><small>Chaque réponse inclut votre niveau de confiance.</small></span></div><button className="text-button" type="button" onClick={onAdmin}>Accéder au suivi admin <ArrowRight size={15} /></button></div>
    </section>
  </div>
}

function Field({ label, hint, children }) { return <label className="field"><span className="field-label">{label}{hint && <small>{hint}</small>}</span>{children}</label> }

function QuizView({ quiz, onSelectAnswer, onSelectConfidence, onSubmit, onNext }) {
  const question = quiz.questions[quiz.index]
  const theme = getTheme(question.themeId)
  const profile = getPostProfile(quiz.config.postProfileId)
  const answered = Boolean(quiz.feedback)
  const percentage = Math.round((quiz.index / quiz.questions.length) * 100)
  return <div className="quiz-page page-enter"><div className="quiz-topline"><button className="back-link" onClick={() => window.confirm('Quitter cette session ? Les réponses non finalisées seront perdues.') && window.location.reload()}><ArrowLeft size={15} />Quitter la session</button><div className="quiz-user"><span className="avatar mini lime">{initials(quiz.config.name)}</span><span>{quiz.config.name}</span><span className="separator-dot" />{profile.label}<span className="separator-dot" />{quiz.config.mode}</div></div><div className="progress-track"><span style={{ width: `${Math.max(8, percentage)}%` }} /></div><div className="quiz-header"><div><span className={`theme-kicker ${theme.tone}`}><Icon name={theme.icon} size={14} />{theme.name}</span><h1>Question <span>{String(quiz.index + 1).padStart(2, '0')}</span><small> / {String(quiz.questions.length).padStart(2, '0')}</small></h1></div><div className="quiz-source"><span>RÉFÉRENCE</span><strong>{question.source}</strong>{question.critical && <em><Zap size={12} />Critique</em>}</div></div><div className="question-layout"><div className="question-card"><div className="question-marker"><span>Q{String(quiz.index + 1).padStart(2, '0')}</span><span className="marker-line" /></div><h2>{question.prompt}</h2><div className="answers-list">{question.choices.map((choice, index) => <button disabled={answered} key={choice} className={`answer-option ${quiz.selectedIndex === index ? 'selected' : ''} ${answered && index === question.correctIndex ? 'is-correct' : ''} ${answered && quiz.selectedIndex === index && index !== question.correctIndex ? 'is-wrong' : ''}`} onClick={() => onSelectAnswer(index)}><span className="choice-letter">{String.fromCharCode(65 + index)}</span><span>{choice}</span>{answered && index === question.correctIndex && <Check size={17} />}</button>)}</div>{quiz.feedback && <div className={`feedback-box ${quiz.feedback.correct ? 'success' : 'warning'}`}><div className="feedback-icon">{quiz.feedback.correct ? <Check size={18} /> : <CircleHelp size={18} />}</div><div><strong>{quiz.feedback.correct ? 'Réflexe juste.' : quiz.feedback.diagnostic === 'surconfiance' ? 'Point de vigilance : surconfiance.' : 'Réponse à consolider.'}</strong><p>{question.rationale}</p></div></div>}<div className="question-actions">{!answered ? <button className="primary-button" onClick={onSubmit}>Valider la réponse <ArrowRight size={16} /></button> : <button className="primary-button" onClick={onNext}>{quiz.index === quiz.questions.length - 1 ? 'Voir mon bilan' : 'Question suivante'} <ArrowRight size={16} /></button>}</div></div><aside className="confidence-card"><div className="confidence-title"><span className="eyebrow compact"><span className="eyebrow-line" />Votre lecture</span><strong>Quel est votre niveau de certitude ?</strong></div><p>Cette information aide à distinguer un acquis solide d’un automatisme à entretenir.</p><div className="confidence-list">{[['sur', 'Sûr', 'Je saurais l’expliquer à un collègue.', 'good'], ['hesitant', 'Hésitant', 'J’hésite entre plusieurs réponses.', 'warn'], ['hasard', 'Au hasard', 'Je ne connais pas réellement la réponse.', 'bad']].map(([id, label, description, tone]) => <button disabled={answered} key={id} className={`confidence-option ${tone} ${quiz.confidence === id ? 'selected' : ''}`} onClick={() => onSelectConfidence(id)}><span className="confidence-dot" /><span><strong>{label}</strong><small>{description}</small></span>{quiz.confidence === id && <Check size={15} />}</button>)}</div><div className="confidence-foot"><Shield size={14} /><span>La certitude n’influence pas votre score.<br />Elle nourrit le diagnostic.</span></div></aside></div><div className="quiz-footer"><span><span className="footer-led" />Session enregistrée automatiquement à la fin</span><span>{quiz.answers.length} réponse{quiz.answers.length > 1 ? 's' : ''} validée{quiz.answers.length > 1 ? 's' : ''}</span></div></div>
}

function ReportView({ report, onNew }) {
  const breakdown = themes.map((theme) => { const indexes = report.questions.map((question, index) => question.themeId === theme.id ? index : -1).filter((index) => index >= 0); const answers = indexes.map((index) => report.answers[index]).filter(Boolean); return { theme, total: answers.length, correct: answers.filter((answer) => answer.correct).length } }).filter((item) => item.total)
  return <div className="report-page page-enter"><div className="report-intro"><span className="eyebrow"><span className="eyebrow-line" />Session terminée · {formatDate(report.completedAt)}</span><h1>Votre signal est<br /><em>{report.score >= 80 ? 'bien calibré.' : 'à entretenir.'}</em></h1><p>Voici une lecture courte de votre session. Le résultat compte, mais les zones d’hésitation donnent surtout la prochaine piste de travail.</p><button className="primary-button" onClick={onNew}>Relancer une session <RotateCcw size={16} /></button></div><div className="report-score-card"><div className="score-ring" style={{ '--score': `${report.score * 3.6}deg` }}><div><strong>{report.score}<small>%</small></strong><span>score global</span></div></div><div className="score-summary"><div><span className="stat-label">Réponses solides</span><strong>{report.answers.filter((answer) => answer.correct).length}<small> / {report.questionCount}</small></strong></div><div><span className="stat-label">Surconfiances</span><strong className={report.overconfidence ? 'orange-text' : ''}>{report.overconfidence}</strong></div><div><span className="stat-label">Cruciales manquées</span><strong className={report.criticalFailures ? 'red-text' : ''}>{report.criticalFailures}</strong></div></div></div><section className="breakdown-section"><div className="section-heading"><div><span className="eyebrow compact"><span className="eyebrow-line" />Lecture par domaine</span><h2>Les prochains automatismes à garder vivants</h2></div><span className="small-note"><span className="status-dot good" />Bilan partagé avec le référent</span></div><div className="breakdown-grid">{breakdown.map(({ theme, total, correct }) => <div className="breakdown-card" key={theme.id}><div className={`theme-icon ${theme.tone}`}><Icon name={theme.icon} size={16} /></div><div className="breakdown-card-head"><strong>{theme.short}</strong><span>{Math.round((correct / total) * 100)}%</span></div><div className="bar"><span className={scoreTone(Math.round((correct / total) * 100))} style={{ width: `${(correct / total) * 100}%` }} /></div><small>{correct} bonne{correct > 1 ? 's' : ''} réponse{correct > 1 ? 's' : ''} sur {total}</small></div>)}</div></section><div className="report-footer-note"><Sparkles size={16} /><span><strong>Rituel conseillé</strong> — Refaire une session ciblée dans 7 jours sur les domaines sous 80 %.</span></div></div>
}

function AdminOverview({ store, onNavigate }) {
  const attempts = store.attempts
  const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0
  const overconfidence = attempts.length ? Math.round((attempts.reduce((sum, attempt) => sum + attempt.overconfidence, 0) / attempts.reduce((sum, attempt) => sum + attempt.questionCount, 0)) * 100) : 0
  const published = store.questions.filter((question) => question.status === 'published').length
  const critical = store.questions.filter((question) => question.critical).length
  return <div className="admin-page page-enter"><div className="admin-welcome"><div><span className="eyebrow"><span className="eyebrow-line" />Pilotage des compétences · aujourd’hui</span><h1>Voir où le terrain<br /><em>a besoin de vous.</em></h1><p>Un coup d’œil sur les signaux faibles, les équipes et la qualité de la banque.</p></div><div className="date-stamp"><span>20 AOÛT</span><strong>2026</strong><small>Jeudi · quart du matin</small></div></div><div className="kpi-grid"><Kpi label="Score moyen" value={`${average}%`} meta={`${attempts.length} sessions enregistrées`} tone="mint" icon={TrendingUp} /><Kpi label="Sessions réalisées" value={attempts.length} meta="sur les 30 derniers jours" tone="blue" icon={Users} /><Kpi label="Surconfiance" value={`${overconfidence}%`} meta="des réponses analysées" tone="orange" icon={Zap} /><Kpi label="Questions actives" value={published || store.questions.length} meta={`${critical} situations critiques`} tone="violet" icon={ListChecks} /></div><div className="admin-grid"><section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow compact"><span className="eyebrow-line" />Flux récent</span><h2>Dernières évaluations</h2></div><button className="text-button" onClick={() => onNavigate('results')}>Tout voir <ArrowRight size={15} /></button></div>{attempts.slice(0, 4).map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)}{!attempts.length && <EmptyState text="Aucune session pour le moment." />}</section><section className="panel domain-panel"><div className="panel-heading"><div><span className="eyebrow compact"><span className="eyebrow-line" />Carte des domaines</span><h2>Signal collectif</h2></div><button className="icon-button small" aria-label="Options"><MoreHorizontal size={17} /></button></div><div className="domain-bars">{themes.map((theme) => { const related = attempts.flatMap((attempt) => attempt.themeIds.includes(theme.id) ? [attempt.score] : []); const score = related.length ? Math.round(related.reduce((sum, item) => sum + item, 0) / related.length) : 0; return <div className="domain-bar-row" key={theme.id}><div className="domain-label"><span className={`theme-dot ${theme.tone}`} />{theme.short}<strong>{score || '—'}{score ? '%' : ''}</strong></div><div className="bar"><span className={scoreTone(score)} style={{ width: `${score}%` }} /></div></div> })}</div><div className="domain-legend"><span><i className="legend-square good" />Acquis</span><span><i className="legend-square warn" />À consolider</span><span><i className="legend-square bad" />Priorité</span></div></section></div><div className="admin-bottom-grid"><section className="attention-card"><div className="attention-icon"><Bell size={19} /></div><div><span className="eyebrow compact"><span className="eyebrow-line" />À regarder cette semaine</span><h3>2 collaborateurs ont un signal de surconfiance</h3><p>Un score correct accompagné d’une certitude mal calibrée mérite une reprise ciblée.</p></div><button className="outline-button" onClick={() => onNavigate('results')}>Voir les profils <ArrowRight size={15} /></button></section><section className="quick-card"><div className="quick-card-head"><span className="theme-icon blue"><BookOpen size={16} /></span><div><span className="eyebrow compact"><span className="eyebrow-line" />Banque de questions</span><strong>{published || store.questions.length} active{published > 1 ? 's' : ''}</strong></div></div><p>{store.questions.length - published} brouillon{store.questions.length - published > 1 ? 's' : ''} à relire avant publication.</p><button className="text-button" onClick={() => onNavigate('bank')}>Gérer la banque <ArrowRight size={15} /></button></section></div></div>
}

function Kpi({ label, value, meta, tone, icon: KpiIcon }) { return <div className="kpi-card"><div className={`kpi-icon ${tone}`}><KpiIcon size={17} /></div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div><span className={`kpi-spark ${tone}`} /></div> }

function AttemptRow({ attempt }) { return <div className="attempt-row"><div className="avatar">{initials(attempt.employeeName)}</div><div className="attempt-person"><strong>{attempt.employeeName}</strong><span>{attempt.team} · {attempt.role}</span></div><span className="attempt-mode">{attempt.mode}</span><span className={`score-pill ${scoreTone(attempt.score)}`}>{attempt.score}%</span><span className="attempt-date">{formatDate(attempt.completedAt)}<small>{formatTime(attempt.completedAt)}</small></span></div> }
function EmptyState({ text }) { return <div className="empty-state"><CircleHelp size={19} /><span>{text}</span></div> }

function AdminResults({ store, onNotify }) {
  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('Toutes les équipes')
  const [postFilter, setPostFilter] = useState('Tous les postes')
  const teams = ['Toutes les équipes', ...new Set(store.attempts.map((attempt) => attempt.team))]
  const attempts = store.attempts.filter((attempt) => attempt.employeeName.toLowerCase().includes(query.toLowerCase()) && (teamFilter === 'Toutes les équipes' || attempt.team === teamFilter) && (postFilter === 'Tous les postes' || getPostProfile(attempt.postProfileId).id === postFilter))
  const exportCsv = () => {
    const lines = [['ID', 'Date', 'Collaborateur', 'Équipe', 'Poste', 'Fonction', 'Mode', 'Score', 'Surconfiances', 'Critiques manquées'], ...attempts.map((attempt) => [attempt.id, attempt.completedAt, attempt.employeeName, attempt.team, getPostProfile(attempt.postProfileId).label, attempt.role, attempt.mode, `${attempt.score}%`, attempt.overconfidence, attempt.criticalFailures])]
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'nops-resultats.csv'; anchor.click(); URL.revokeObjectURL(url); onNotify('Export CSV téléchargé.', 'success')
  }
  return <div className="admin-page page-enter"><div className="page-title-row"><div><span className="eyebrow"><span className="eyebrow-line" />Traçabilité</span><h1>Les résultats, sans angle mort.</h1><p>Filtrez, comparez et exportez les sessions réalisées par vos équipes.</p></div><button className="outline-button" onClick={exportCsv}><Download size={16} />Exporter CSV</button></div><div className="filter-bar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un collaborateur…" /></div><select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>{teams.map((team) => <option key={team}>{team}</option>)}</select><select value={postFilter} onChange={(event) => setPostFilter(event.target.value)}><option>Tous les postes</option>{postProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select><button className="filter-button"><SlidersHorizontal size={16} />Filtres <span>0</span></button></div><section className="panel results-table-panel"><div className="table-meta"><span><strong>{attempts.length}</strong> session{attempts.length > 1 ? 's' : ''}</span><span className="table-legend"><i className="status-dot good" />Solide <i className="status-dot warn" />À consolider <i className="status-dot bad" />Priorité</span></div><div className="table-wrap"><table><thead><tr><th>Collaborateur</th><th>Équipe</th><th>Poste</th><th>Mode</th><th>Date</th><th>Score</th><th>Surconfiance</th><th>Critiques</th><th /></tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id}><td><div className="table-person"><div className="avatar">{initials(attempt.employeeName)}</div><span><strong>{attempt.employeeName}</strong><small>{attempt.role}</small></span></div></td><td>{attempt.team}</td><td><span className="mode-tag">{getPostProfile(attempt.postProfileId).label}</span></td><td><span className="mode-tag">{attempt.mode}</span></td><td>{formatDate(attempt.completedAt)}</td><td><span className={`score-pill ${scoreTone(attempt.score)}`}>{attempt.score}%</span></td><td><span className={attempt.overconfidence ? 'orange-text table-strong' : 'muted-table'}>{attempt.overconfidence || '—'}</span></td><td><span className={attempt.criticalFailures ? 'red-text table-strong' : 'muted-table'}>{attempt.criticalFailures || '—'}</span></td><td><button className="icon-button small" aria-label={`Ouvrir ${attempt.employeeName}`} onClick={() => onNotify('Le détail individuel sera disponible dans la prochaine itération.', 'info')}><ArrowRight size={15} /></button></td></tr>)}</tbody></table>{!attempts.length && <EmptyState text="Aucun résultat ne correspond à vos filtres." />}</div></section></div>
}

function QuestionBank({ store, onEdit, onNew }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Tous')
  const filtered = store.questions.filter((question) => (question.prompt.toLowerCase().includes(query.toLowerCase()) || question.source.toLowerCase().includes(query.toLowerCase())) && (status === 'Tous' || question.status === status))
  return <div className="admin-page page-enter"><div className="page-title-row"><div><span className="eyebrow"><span className="eyebrow-line" />Référentiel métier</span><h1>Une banque qui reste vivante.</h1><p>Créez, relisez et publiez les questions à partir des supports d’exploitation.</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />Nouvelle question</button></div><div className="filter-bar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une question ou une référence…" /></div><div className="segmented-filter">{['Tous', 'published', 'draft'].map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item === 'Tous' ? 'Toutes' : item === 'published' ? 'Publiées' : 'Brouillons'}<span>{item === 'Tous' ? store.questions.length : store.questions.filter((question) => question.status === item).length}</span></button>)}</div></div><section className="panel bank-panel"><div className="table-meta"><span><strong>{filtered.length}</strong> questions dans le référentiel</span><span className="draft-note"><span className="status-dot warn" />Les brouillons restent invisibles dans une session standard.</span></div><div className="question-list">{filtered.map((question) => { const theme = getTheme(question.themeId); const labels = (question.targetPosts || []).map((id) => getPostProfile(id).label).join(', '); return <div className="question-row" key={question.id}><div className={`theme-icon ${theme.tone}`}><Icon name={theme.icon} size={16} /></div><div className="question-main"><div className="question-row-meta"><span>{question.id}</span><span className={`status-label ${question.status}`}>{question.status === 'published' ? 'Publiée' : 'Brouillon'}</span>{question.critical && <span className="critical-label"><Zap size={11} />Critique</span>}</div><strong>{question.prompt}</strong><small>{theme.short} · {question.source} · {question.choices.length} choix · {labels || 'Tous les postes'}</small></div><button className="icon-button" onClick={() => onEdit(question)} aria-label="Modifier la question"><Edit3 size={16} /></button></div> })}{!filtered.length && <EmptyState text="Aucune question ne correspond à votre recherche." />}</div></section></div>
}

function AdminGate({ onClose, onEnter }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const submit = async (event) => { event.preventDefault(); setPending(true); setError(''); if (!backendEnabled) { setPending(false); onEnter(); return } const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) { setError('Identifiants refusés. Vérifiez le compte Auth Supabase.'); setPending(false); return } setPending(false); onEnter() }
  return <div className="modal-backdrop"><div className="admin-modal"><button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button><div className="modal-symbol"><Shield size={20} /></div><span className="eyebrow compact"><span className="eyebrow-line" />Accès référent</span><h2>Ouvrir le pilotage.</h2><p>{backendEnabled ? 'Connectez-vous avec votre compte référent pour accéder aux résultats partagés.' : 'La base locale est active. Ouvrez le mode démo pour explorer le pilotage et la banque.'}</p>{backendEnabled ? <form onSubmit={submit}><Field label="Email"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="referent@entreprise.fr" /></Field><Field label="Mot de passe"><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>{error && <div className="form-error">{error}</div>}<button className="primary-button full-button" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'} <ArrowRight size={16} /></button></form> : <><div className="demo-callout"><Sparkles size={16} /><span><strong>Mode démo disponible</strong><small>Les données sont conservées dans ce navigateur uniquement.</small></span></div><button className="primary-button full-button" onClick={onEnter}>Entrer dans le pilotage <ArrowRight size={16} /></button></>}<button className="modal-cancel" onClick={onClose}>Retour</button></div></div>
}

function QuestionEditor({ question, onClose, onSave }) {
  const [draft, setDraft] = useState(question ? { ...question, targetPosts: question.targetPosts?.length ? question.targetPosts : [...allPostProfileIds] } : { id: 'Q-NEW', themeId: 'gaz', status: 'draft', critical: false, prompt: '', choices: ['', '', '', ''], correctIndex: 0, rationale: '', source: 'EXP-U-15-002', targetPosts: [...allPostProfileIds] })
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const updateChoice = (index, value) => setDraft((current) => ({ ...current, choices: current.choices.map((choice, choiceIndex) => choiceIndex === index ? value : choice) }))
  const togglePost = (postId) => setDraft((current) => ({ ...current, targetPosts: (current.targetPosts || []).includes(postId) ? current.targetPosts.filter((id) => id !== postId) : [...(current.targetPosts || []), postId] }))
  const submit = (event) => { event.preventDefault(); if (!draft.prompt.trim() || draft.choices.some((choice) => !choice.trim()) || !draft.rationale.trim() || !draft.targetPosts?.length) return; onSave({ ...draft, id: draft.id === 'Q-NEW' ? makeId('Q') : draft.id }) }
  return <div className="modal-backdrop"><div className="editor-modal"><div className="editor-header"><div><span className="eyebrow compact"><span className="eyebrow-line" />{question ? 'Modifier' : 'Nouveau'} referentiel</span><h2>{question ? question.id : 'Nouvelle question'}</h2></div><button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><form onSubmit={submit}><div className="editor-grid"><Field label="Theme"><select value={draft.themeId} onChange={(event) => update('themeId', event.target.value)}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></Field><Field label="Reference source"><input value={draft.source} onChange={(event) => update('source', event.target.value)} placeholder="EXP-U-15-002" /></Field></div><div><div className="field-label">Postes concernes <small>La question sera proposee uniquement a ces profils</small></div><div className="post-target-grid">{postProfiles.map((profile) => <label className="post-target-option" key={profile.id}><input type="checkbox" checked={(draft.targetPosts || []).includes(profile.id)} onChange={() => togglePost(profile.id)} />{profile.label}</label>)}</div></div><label className="check-line"><input type="checkbox" checked={draft.critical} onChange={(event) => update('critical', event.target.checked)} /><span><strong>Situation critique</strong><small>Prioriser cette question en revision ciblee.</small></span></label><Field label="Question"><textarea rows="3" required value={draft.prompt} onChange={(event) => update('prompt', event.target.value)} placeholder="Formulez une situation observable sur le terrain..." /></Field><div className="field-label">Reponses <small>Choisissez la bonne reponse</small></div><div className="choice-editor">{draft.choices.map((choice, index) => <div className={`choice-input ${draft.correctIndex === index ? 'correct' : ''}`} key={index}><button type="button" onClick={() => update('correctIndex', index)} aria-label={`Definir la reponse ${index + 1} comme correcte`}>{draft.correctIndex === index ? <Check size={15} /> : String.fromCharCode(65 + index)}</button><input required value={choice} onChange={(event) => updateChoice(index, event.target.value)} placeholder={`Reponse ${String.fromCharCode(65 + index)}`} /></div>)}</div><Field label="Rappel de consigne"><textarea rows="3" required value={draft.rationale} onChange={(event) => update('rationale', event.target.value)} placeholder="Expliquez le raisonnement attendu..." /></Field><div className="editor-footer"><div className="publish-select"><span className="field-label">Statut de publication</span><select value={draft.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Brouillon</option><option value="published">Publiee</option></select></div><div className="editor-actions"><button type="button" className="modal-cancel" onClick={onClose}>Annuler</button><button className="primary-button" type="submit">Enregistrer <Check size={16} /></button></div></div></form></div></div>
}

createRoot(document.getElementById('root')).render(<App />)
