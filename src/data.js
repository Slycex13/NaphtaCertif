export const themes = [
  { id: 'gaz', name: 'Gaz naturel & consommation', short: 'Gaz naturel', code: 'EXP-U-15-002', tone: 'mint', icon: 'activity' },
  { id: 'hydrogene', name: 'Réseau hydrogène 1,2 B', short: 'Hydrogène', code: 'EXP-U-15-004', tone: 'blue', icon: 'wind' },
  { id: 'torche', name: 'Réseau gaz & torche', short: 'Gaz & torche', code: 'EXP-U-15-005', tone: 'orange', icon: 'flame' },
  { id: 'hp-bp', name: 'Exploitation réseau gaz HP/BP', short: 'Réseau HP/BP', code: 'EXP-U-15-006', tone: 'violet', icon: 'git-branch' },
  { id: 'rechauffeurs', name: 'Réchauffeurs E004/E005 & Parc Sud', short: 'Réchauffeurs', code: 'EXP-U-15-007', tone: 'yellow', icon: 'thermometer' },
  { id: 'securite', name: 'Sécurités, BMS & ESD', short: 'Sécurités', code: 'EXP-U-15-TRAME', tone: 'red', icon: 'shield' },
]

export const postProfiles = [
  {
    id: 'operateur',
    label: 'Opérateur',
    short: 'Rondes & manœuvres',
    description: 'Gestes terrain, mises en sécurité et transmission des écarts.',
    tone: 'orange',
    icon: 'activity',
  },
  {
    id: 'rondier',
    label: 'Rondier',
    short: 'Surveillance terrain',
    description: 'Relevés, détection d’anomalies et contrôle des équipements.',
    tone: 'mint',
    icon: 'wind',
  },
  {
    id: 'chef-thermique',
    label: 'Chef de poste thermique',
    short: 'Chaudières & vapeur',
    description: 'Conduite thermique, combustibles et performance énergétique.',
    tone: 'yellow',
    icon: 'flame',
  },
  {
    id: 'chef-elec',
    label: 'Chef de poste électrique',
    short: 'RDE & consignations',
    description: 'Réseau électrique, utilités hors vapeur et manœuvres HT/BT.',
    tone: 'blue',
    icon: 'zap',
  },
  {
    id: 'chef-quart',
    label: 'Chef de quart',
    short: 'Coordination & arbitrage',
    description: 'Vision globale, décisions sûres et conduite des situations incidentelles.',
    tone: 'violet',
    icon: 'shield',
  },
]

export const allPostProfileIds = postProfiles.map((profile) => profile.id)
export const getPostProfile = (profileId) => postProfiles.find((profile) => profile.id === profileId) || postProfiles[0]
export const questionMatchesPost = (question, profileId) => !question.targetPosts?.length || question.targetPosts.includes(profileId)

// Jeu de départ issu des domaines identifiés dans les supports fournis.
// Les formulations métier sont marquées "à valider" dans le panel admin avant publication.
export const seedQuestions = [
  {
    id: 'Q-001', themeId: 'gaz', status: 'draft', critical: false,
    prompt: 'Face à une dérive de consommation de GDF, quel est le meilleur premier réflexe ?',
    choices: ['Comparer la mesure à un historique et au contexte d’exploitation', 'Modifier immédiatement la consigne de production', 'Ignorer la dérive si la pression reste stable', 'Arrêter tous les consommateurs sans diagnostic'],
    correctIndex: 0,
    rationale: 'Une dérive se qualifie d’abord par comparaison avec une référence et avec les conditions réelles de marche.',
    source: 'EXP-U-15-002',
  },
  {
    id: 'Q-002', themeId: 'gaz', status: 'draft', critical: true,
    prompt: 'Quelle information doit accompagner une alerte de consommation anormale ?',
    choices: ['La tendance, la période observée et les équipements concernés', 'Uniquement la valeur instantanée', 'Le nom de l’opérateur précédent', 'Une capture sans date ni unité'],
    correctIndex: 0,
    rationale: 'Une alerte exploitable doit être contextualisée pour permettre une décision traçable.',
    source: 'EXP-U-15-002',
  },
  {
    id: 'Q-003', themeId: 'hydrogene', status: 'draft', critical: true,
    prompt: 'Lors de la surveillance du réseau hydrogène, quelle pratique est attendue ?',
    choices: ['Suivre les paramètres, les alarmes et les écarts dans le temps', 'Réarmer chaque alarme sans rechercher sa cause', 'Attendre la ronde suivante pour signaler un écart', 'Travailler uniquement à partir de la valeur nominale'],
    correctIndex: 0,
    rationale: 'La surveillance repose sur la lecture des tendances et la levée documentée des écarts.',
    source: 'EXP-U-15-004',
  },
  {
    id: 'Q-004', themeId: 'torche', status: 'draft', critical: true,
    prompt: 'Avant toute action visant à éviter une mise à la torche, que faut-il préserver en priorité ?',
    choices: ['La sécurité des personnes et l’intégrité du procédé', 'La réduction de consommation à tout prix', 'La rapidité au détriment de la consignation', 'La continuité d’un seul équipement'],
    correctIndex: 0,
    rationale: 'La maîtrise des émissions ne doit jamais conduire à dégrader une barrière de sécurité ou une étape de conduite.',
    source: 'EXP-U-15-005',
  },
  {
    id: 'Q-005', themeId: 'torche', status: 'draft', critical: false,
    prompt: 'Une mise à la torche doit être analysée comme :',
    choices: ['Un événement à caractériser, tracer et rapprocher de la consigne d’exploitation', 'Une anomalie à masquer dans le compte rendu', 'Une preuve suffisante de défaillance d’un opérateur', 'Un événement sans intérêt si la flamme est stable'],
    correctIndex: 0,
    rationale: 'La traçabilité permet de relier l’événement à son contexte et de préparer les actions correctives.',
    source: 'EXP-U-15-005',
  },
  {
    id: 'Q-006', themeId: 'hp-bp', status: 'draft', critical: true,
    prompt: 'Avant une intervention sur le réseau gaz HP/BP, le contrôle clé porte sur :',
    choices: ['La configuration réelle, l’autorisation et les conditions de sécurité', 'La couleur de l’étiquette de l’équipement uniquement', 'La dernière valeur affichée, sans vérification terrain', 'La disponibilité d’un opérateur non habilité'],
    correctIndex: 0,
    rationale: 'Toute intervention doit s’appuyer sur une configuration vérifiée et un cadre d’intervention autorisé.',
    source: 'EXP-U-15-006',
  },
  {
    id: 'Q-007', themeId: 'rechauffeurs', status: 'draft', critical: false,
    prompt: 'Pour une manœuvre liée aux réchauffeurs E004/E005, la coordination avec le Parc Sud sert à :',
    choices: ['Aligner les conditions d’intervention et éviter une action contradictoire', 'Remplacer la lecture des consignes', 'Réduire le nombre de contrôles nécessaires', 'Autoriser une manœuvre hors communication'],
    correctIndex: 0,
    rationale: 'La coordination rend l’interface d’intervention explicite et limite les risques de manœuvres incompatibles.',
    source: 'EXP-U-15-007',
  },
  {
    id: 'Q-008', themeId: 'securite', status: 'draft', critical: true,
    prompt: 'Une alarme BMS/ESD doit être traitée en premier lieu par :',
    choices: ['La compréhension de l’état sûr et l’application de la conduite à tenir', 'Un contournement immédiat de la sécurité', 'Un acquittement sans vérification', 'La poursuite de la manœuvre initiale'],
    correctIndex: 0,
    rationale: 'L’état sûr et la conduite à tenir priment sur la reprise rapide de l’opération.',
    source: 'EXP-U-15-TRAME',
  },
]

const sampleAnswers = (questions, correctCount, overconfidenceAt = []) => questions.map((question, index) => {
  const correct = index < correctCount
  const overconfident = overconfidenceAt.includes(index)
  return { questionId: question.id, selectedIndex: correct ? question.correctIndex : (question.correctIndex + 1) % question.choices.length, correct, confidence: correct && !overconfident ? 'sur' : overconfident ? 'sur' : 'hesitant', diagnostic: !correct && overconfident ? 'surconfiance' : correct ? 'solide' : 'erreur' }
})

export const seedAttempts = [
  { id: 'ATT-1048', employeeName: 'Aïcha Benali', team: 'Équipe 2', role: 'Chef de quart', mode: 'Évaluation', score: 88, questionCount: 8, overconfidence: 0, criticalFailures: 0, themeIds: ['gaz', 'securite', 'hp-bp'], completedAt: '2026-08-19T08:42:00.000Z', answers: sampleAnswers(seedQuestions, 7) },
  { id: 'ATT-1047', employeeName: 'Thomas Morel', team: 'Équipe 1', role: 'Consoliste / Chef de poste', mode: 'Révision ciblée', score: 75, questionCount: 8, overconfidence: 1, criticalFailures: 1, themeIds: ['torche', 'hydrogene'], completedAt: '2026-08-18T15:10:00.000Z', answers: sampleAnswers(seedQuestions, 6, [6]) },
  { id: 'ATT-1046', employeeName: 'Nadia Khelifi', team: 'Équipe 3', role: 'Opérateur extérieur', mode: 'Entraînement', score: 63, questionCount: 8, overconfidence: 2, criticalFailures: 1, themeIds: ['rechauffeurs', 'securite'], completedAt: '2026-08-18T09:24:00.000Z', answers: sampleAnswers(seedQuestions, 5, [1, 3]) },
  { id: 'ATT-1045', employeeName: 'Lucas Perrin', team: 'Équipe 1', role: 'Opérateur extérieur', mode: 'Évaluation', score: 100, questionCount: 8, overconfidence: 0, criticalFailures: 0, themeIds: ['gaz', 'torche'], completedAt: '2026-08-16T11:35:00.000Z', answers: sampleAnswers(seedQuestions, 8) },
]

export const defaultStore = { questions: seedQuestions, attempts: seedAttempts, isDemo: true }

export const getTheme = (themeId) => themes.find((theme) => theme.id === themeId) || themes[0]
