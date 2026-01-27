# Personnal Time Tracking — Spec & Implementation Canvas

> Objectif : permettre à un agent IA d’implémenter **de manière autonome** un projet complet (monorepo) pour suivre des pointages (entrées/sorties), calculer un solde quotidien + global, gérer purge semestrielle et quota télétravail.

## 0) Contraintes non négociables

- Monorepo : `backend/` + `frontend/`.
- Backend : Node.js + TypeScript + Express + Prisma + PostgreSQL.
- Frontend : Vue 3 + TypeScript + Tailwind (max Tailwind, min CSS).
- Dockerisation :
  - Backend image avec `entrypoint.sh` qui exécute `prisma migrate deploy` avant `node dist/server.js`.
  - `docker-compose.dev.yml` : **uniquement** la DB PostgreSQL pour dev local.
  - `docker-compose.yml` : production, pointe sur images GHCR.
- CI GitHub Actions :
  - À chaque commit/PR : lint + test + build (backend et front).
  - Au tag : lint + test + build + build/push images docker sur GHCR.
  - Registry : `ghcr.io/valcriss/` et repo `personnal-time-tracking`.
- Tests : couverture **100%** lignes, branches, fonctions/méthodes (backend & frontend).
  - Backend : **mock DB** (pas de Postgres réel en tests). Prisma isolé dans une couche infrastructure.

## 1) Modèle fonctionnel

### 1.1 Types de journée

- `NORMAL` (par défaut)
- `SICK` (arrêt maladie)
- `TRIP` (déplacement)
- `VACATION` (congés)
- `RTT` (congé RTT)
- `OTHER` (autre congé)

Effets :
- Si type ∈ {SICK, VACATION, RTT, OTHER} :
  - crédit compteur temps = **0 min**
  - solde du jour = **+00:00** (ne crédite pas, ne débite pas)
  - pointages ignorés (UI désactivée/grisée)
- Si type = TRIP :
  - crédit compteur temps = **7h48** (468 min) **sans bonus**
  - solde du jour = **+00:00**
  - pointages ignorés (UI désactivée/grisée)
- Si type = NORMAL :
  - crédit compteur temps = minutes travaillées retenues + **5 min** (temps boot PC)
  - **Les 5 min ne comptent pas** pour les plafonds (matin/AM/total)
  - **Bonus 5 min non appliqué si total (hors bonus) ≥ 10h**

### 1.2 Pointages (entrées/sorties)

- Une journée contient des pointages alternant IN/OUT.
- Il peut y avoir plusieurs sorties/entrées (absences en journée).
- Une journée est **complète** si :
  - nombre de timestamps pair
  - alternance valide IN→OUT→IN→OUT…

### 1.3 Règles de calcul

Constantes :
- Attendu par jour : **7h48** = 468 min.
- Début de journée au plus tôt : **07:00**. Si première entrée avant, on compte à partir de 07:00.
- Pause déjeuner :
  - peut être prise entre **11:30 et 14:30**
  - doit faire au moins **30 min**
  - si non prise ou < 30 min : appliquer une **pause fictive de 30 min**
- Plafonds (temps supplémentaire ignoré) :
  - Matin (du début jusqu’à la pause déjeuner) : max **6h** retenues (360 min)
  - Après-midi (de fin pause déjeuner à la dernière sortie) : max **6h** retenues (360 min)
  - Total journalier retenu : max **10h** (600 min)

Définition opérationnelle de la pause déjeuner (MVP robuste) :
- On identifie les intervalles de pause `OUT -> IN`.
- Une pause est considérée "déjeuner" si elle **chevauche** la fenêtre [11:30, 14:30].
- On prend comme pause déjeuner la **plus longue** de ces pauses.
- Si aucune pause ne chevauche la fenêtre ou si la pause déjeuner identifiée < 30 min : appliquer **30 min fictifs**.
- Placement de la pause fictive :
  - Par défaut : [12:30, 13:00].
  - Si ce créneau n’est pas applicable (pas de travail autour), placer au **premier créneau possible** dans [11:30, 14:30].

Découpage matin/AM :
- Matin = temps travaillé avant le début de la pause déjeuner (réelle ou fictive).
- Après-midi = temps travaillé après la fin de la pause déjeuner.

### 1.4 Solde

- Pour `NORMAL` : solde du jour = (crédit du jour) - 7h48.
- Pour `SICK`, `TRIP`, `VACATION`, `RTT`, `OTHER` : solde du jour = **0**.
- Solde global = somme des soldes jour ± ajustements (purges) sur la période.

### 1.5 Purge des compteurs

- Les **1er janvier** et **1er juillet** :
  - si solde global est **négatif** : il est conservé tel quel
  - si solde global est **positif** : il est remis à **0**

Implémentation recommandée : ledger (grand livre) avec opérations, pour conserver historique.

### 1.6 Télétravail

- Checkbox par jour : `telework=true/false`.
- Droit : **100 jours de télétravail par année civile**.
- Compteur affiché : consommés / 100 et restants.

## 2) UX/UI attendue

### 2.1 Layout

- Page unique principale.
- Header sticky (toujours visible) :
  - Solde global (temps)
  - Solde du jour (ligne sélectionnée / aujourd’hui)
  - Télétravail consommé / restant (sur l’année en cours)
  - Indicateur “journée incomplète” si aujourd’hui n’a pas de paires IN/OUT valides

### 2.2 Tableau

Par ligne :
- Date
- Type de jour (select)
- Télétravail (checkbox)
- Bloc Matin : liste de segments (start/end)
- Bloc Après-midi : liste de segments (start/end)
- Solde jour (calculé)
- Actions : crayon (édition)

Règles d’édition :
- Aujourd’hui (dernière journée) est éditable directement.
- Jours passés complets : lecture seule + bouton ✏️ pour édition inline.
- Aucune saisie de date future : la date max affichée est aujourd’hui.

Saisie segments :
- `input type="time"`.
- Bouton + ajoute un segment.
- Nouveau segment prérempli avec l’heure de fin du segment précédent (start).

Affichage warnings (tooltip / sous-texte léger) :
- Début ramené à 07:00
- Pause fictive appliquée
- Plafonds atteints (matin/AM/total)
- Segment invalide (end <= start)

## 3) Architecture technique

### 3.1 Monorepo

- Root : workspaces npm.
- `backend/` : Express, Prisma.
- `frontend/` : Vue3 + Vite + Tailwind.

### 3.2 Backend — couche et testabilité

- Séparer strictement :
  - `domain/` : règles métiers + moteur de calcul pur (sans Prisma)
  - `usecases/` : orchestration
  - `repositories/` (ports) : interfaces TypeScript
  - `adapters/` : impl Prisma (infrastructure)
  - `controllers/` : routes Express

Tests :
- Tester `domain/` et `usecases/` avec mocks des repos.
- Les routes (Supertest) doivent mocker les usecases (ou utiliser in-memory repo), sans DB.

### 3.3 Frontend — architecture

- Composants :
  - `AppHeader` (soldes)
  - `TimesheetTable` (tableau)
  - `DayRow` (lecture/édition)
  - `SegmentsEditor` (matin/AM)
- Store (Pinia) :
  - charge les jours (ex. 30 derniers)
  - met à jour la journée en cours
  - expose computed : solde global, solde du jour, compteur télétravail

### 3.4 Moteur de calcul partageable (optionnel)

- Recommandé : implémenter le moteur de calcul en TS pur dans `backend/src/domain/timecalc/`.
- Option : le dupliquer côté front si besoin, ou exposer une API `POST /api/calc/day`.

## 4) Modèle de données (Prisma)

### 4.1 Tables

- `Day` : date unique, type, telework, archived.
- `Punch` : dayId, kind (IN/OUT), timestamp.
- `LedgerOperation` : date, minutes delta (+/-), reason, dayId nullable.

### 4.2 Conventions de temps

- En DB : timestamps stockés en UTC.
- En UI : saisie en heure locale Europe/Paris.
- En calcul : convertir en minutes depuis minuit pour simplifier.

## 5) API Backend (contrat minimal)

Base URL : `/api`

### 5.1 Days

- `GET /api/days?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - retourne days + punches
- `PUT /api/days/:date`
  - body : `{ type, telework, archived?, morningSegments[], afternoonSegments[] }`
  - côté backend : reconstruit les punches ordonnés (IN/OUT)

### 5.2 Computed

- `GET /api/summary?date=YYYY-MM-DD`
  - retourne :
    - `todayBalanceMinutes`
    - `globalBalanceMinutes`
    - `teleworkUsed` / `teleworkRemaining`

### 5.3 Purge

- Purge automatique au calcul global :
  - Le backend doit intégrer les opérations de purge via `LedgerOperation`.
  - Si l’utilisateur n’a jamais ouvert l’app un jour de purge, l’opération doit quand même être appliquée au premier calcul postérieur.

## 6) Algorithme de calcul (spécification)

Entrée :
- `dayType`
- `telework`
- `segments` (matin + AM) en heures locales, ou punches.

Sortie `DayResult` :
- `creditMinutes` (ce qui crédite le compteur)
- `countedWorkMinutes` (sans les +5 min)
- `morningCountedMinutes` (cap 360)
- `afternoonCountedMinutes` (cap 360)
- `lunchMinutesApplied` (réel ou 30)
- `ignoredMinutes` (au-delà des plafonds)
- `dayBalanceMinutes = creditMinutes - 468` (si `NORMAL`, sinon 0)
- `warnings[]`

Étapes :
1. Si dayType = TRIP :
   - `creditMinutes = 468`, `countedWorkMinutes = 0`, `dayBalanceMinutes = 0`, `warnings=[]`.
2. Si dayType != NORMAL :
   - `creditMinutes = 0`, `countedWorkMinutes = 0`, `dayBalanceMinutes = 0`, `warnings=[]`.
3. Construire timeline travail à partir des segments (ou punches).
4. Ajuster première entrée : `start = max(start, 07:00)`.
5. Identifier pause déjeuner : plus longue pause OUT->IN chevauchant [11:30, 14:30].
   - Si absente ou < 30 : pause fictive 30 appliquée (voir placement).
6. Calculer minutes travaillées avant/après pause.
7. Appliquer caps : matin max 360, AM max 360.
8. Total = min(matin+AM, 600).
9. `creditMinutes = total + 5` si `total < 600`, sinon `creditMinutes = total`.
10. Produire warnings si :
   - pause fictive
   - caps appliqués
   - début ramené à 07:00
   - segments invalides ou journée incomplète

## 7) Cas de tests obligatoires (doivent exister)

Créer une suite de tests qui couvre 100% et inclut au minimum :

1. NORMAL : entrée 06:30 sortie 12:00, pause 12:00-12:45, reprise 13:00-16:48.
   - début ramené à 07:00.
2. NORMAL : pas de pause dans fenêtre → pause fictive 30 appliquée.
3. NORMAL : pause 20 min dans fenêtre → pause fictive 30.
4. NORMAL : matin travaillé 7h → cap matin à 6h.
5. NORMAL : AM travaillé 7h → cap AM à 6h.
6. NORMAL : total travaillé 12h → cap total à 10h.
7. NORMAL : multiple absences (plusieurs segments) + pause déjeuner identifiée comme la plus longue.
8. SICK : crédit 0 sans segments.
9. TRIP : crédit 7h48 sans bonus.
10. VACATION : crédit 0.
11. RTT : crédit 0.
12. OTHER : crédit 0.
11. Télétravail : compteur annuel incrémenté.
12. Purge 01/01 : solde positif remis à 0.
13. Purge 01/07 : solde positif remis à 0.
14. Purge : solde négatif conservé.

## 8) Docker

### 8.1 backend/Dockerfile
- Build TS -> `dist/`.
- Runtime : `npm ci --omit=dev`.
- Copier `prisma/` et `entrypoint.sh`.
- `ENTRYPOINT ["./entrypoint.sh"]`.

### 8.2 docker-compose.dev.yml
- DB Postgres 16.
- Ports exposés 5432.

### 8.3 docker-compose.yml
- Services : `backend`, `frontend`, `db`.
- `backend` et `frontend` utilisent images GHCR :
  - `ghcr.io/valcriss/personnal-time-tracking-backend:latest`
  - `ghcr.io/valcriss/personnal-time-tracking-frontend:latest`

## 9) GitHub Actions

### 9.1 CI (push + PR)
- `npm ci`
- `npm run lint`
- `npm run test` (seuils 100%)
- `npm run build`

### 9.2 Release (tags `v*`)
- mêmes étapes + login GHCR + build/push images backend & front.

## 10) Standards qualité

- ESLint configuré (backend & front).
- Prettier optionnel (si présent : appliqué partout).
- Aucun accès direct Prisma en domain/usecases.
- Validation input API via Zod.
- Les erreurs API sont normalisées : `{ code, message, details? }`.

## 11) Définition du done

- `npm ci && npm run lint && npm run test && npm run build` OK.
- Couverture 100% sur backend et front (thresholds enforce).
- `docker compose -f docker-compose.dev.yml up -d` démarre Postgres.
- Backend : `DATABASE_URL` ok, migrations appliquées via entrypoint.
- Front : page tableau utilisable, aujourd’hui éditable, jours précédents éditables via crayon.
- Header affiche solde global + solde jour + télétravail.
- Workflows GitHub Actions présents et fonctionnels.

