# N/OPS — Compétences d'exploitation

Application de questionnaire et de pilotage destinée aux équipes Utilities / Centrale thermique. Les supports fournis ont servi à organiser les thèmes : consommation GDF, hydrogène, réseau gaz, torche, réchauffeurs et sécurités BMS/ESD.

## Démarrer en local

```bash
npm install
npm run dev
```

Sans variable d'environnement, l'application fonctionne en mode démo avec persistance dans `localStorage`.

## Persistance partagée gratuite

Le front est une SPA statique Vite, donc publiable sur GitHub Pages. Pour partager les résultats entre plusieurs postes, créer un projet gratuit [Supabase](https://supabase.com), exécuter [`supabase/schema.sql`](./supabase/schema.sql), puis renseigner :

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Copier `.env.example` vers `.env.local`. Les résultats sont envoyés dans Supabase ; sans connexion réseau, le mode local prend le relais. Lors de la première connexion admin, si la table `questions` est vide, la banque de départ présente dans `src/data.js` est importée automatiquement. Pour activer le vrai espace admin Supabase, utiliser un compte Auth avec email/mot de passe.

## Questionnaires par poste

L’accueil propose cinq profils : opérateur, rondier, chef de poste thermique, chef de poste électrique et chef de quart. Le profil choisi filtre les questions et est enregistré avec chaque résultat.

Après avoir exécuté `schema.sql`, exécuter une fois [`supabase/role_questionnaires.sql`](./supabase/role_questionnaires.sql) dans Supabase SQL Editor. Le script conserve les résultats existants, ajoute le ciblage par poste, rattache la banque historique aux profils et ajoute 100 questions NC (20 par poste). Les questions sont publiées pour être visibles immédiatement, mais doivent être relues par le référent HSE / exploitation avant une utilisation d’aptitude ou d’habilitation.

## GitHub Pages

Le workflow [`deploy.yml`](./.github/workflows/deploy.yml) construit et publie automatiquement `dist` à chaque push sur `main`. Ajouter les deux variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les secrets GitHub avant le build si la base distante est utilisée.

Les questions livrées sont un jeu de départ marqué « brouillon » : elles doivent être relues et validées par le référent métier avant publication.
