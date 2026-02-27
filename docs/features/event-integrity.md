# Event Integrity (0 erreur de date)

## Objectif

Garantir **zéro erreur silencieuse** sur les dates des événements.

Définition opérationnelle :
- **Aucune date “fausse ou douteuse” ne doit rester en production sans être détectée**.
- Tout événement dont la date ne peut pas être validée avec une confiance suffisante doit être **flag** et placé en file de **revue** (statut `orange`/`rouge`).

## Contexte

Le catalogue d’événements est central au gameplay (modes classique/précision). Une date erronée dégrade :
- la jouabilité (comparaisons “avant/après”)
- la difficulté (écart temporel)
- la crédibilité du produit

## Principe : triangulation (Gemini + Claude)

La validation repose sur une triangulation multi-étapes :

### Phase 1 — SCOREUR (Gemini)
- Entrée : événement (titre, description, éventuels indices) + date existante.
- Sortie :
  - `score_confiance` (0..100)
  - `flags` (ex: ambigu, homonyme, BCE, période longue, source douteuse, etc.)
  - `score_reason`

### Phase 2 — BLIND_DATER (Claude)
- Entrée : événement **sans** la date originale (blind).
- Sortie :
  - `blind_date_year`
  - `blind_date_min` / `blind_date_max`
  - `blind_date_confidence`
  - `blind_date_reasoning`

### Phase 3 — COMPARATEUR (code)
- Entrée : date originale vs blind-date.
- Calcul :
  - `original_year`
  - `delta_years`
- Attribution d’un statut :
  - `vert` : cohérence forte (delta faible + confiance élevée)
  - `orange` : incertitude / ambiguïté (delta moyen ou confiance moyenne)
  - `rouge` : divergence forte ou signaux d’erreur

### Phase 4 — ARBITRE (Claude)
- Uniquement si `orange` ou `rouge`.
- Sortie :
  - `verdict` ∈ (`DATE_ORIGINALE_CORRECTE`, `BLIND_DATE_PLUS_PROBABLE`, `INCERTAIN`, `ERREUR_GRAVE`)
  - `verdict_confidence`
  - `correction_suggeree`

## Stockage : table d’audit

Les résultats sont stockés en base dans `public.evenements_audit` (cf. migration `supabase/migrations/20260223200000_create_evenements_audit.sql`).

Invariants :
- **La table `evenements` n’est jamais modifiée** par l’audit.
- L’audit est **idempotent** par couple `(evenement_id, audit_version)`.

## Règles “0 erreur silencieuse” (acceptance criteria)

Un événement peut être considéré “safe” si :
- statut `vert`
- ET `score_confiance` au-dessus d’un seuil (à définir, ex: 85)
- ET `blind_date_confidence` au-dessus d’un seuil (ex: 70)
- ET `delta_years` ≤ seuil (ex: 0..1)

Sinon :
- `orange` => revue prioritaire (humain ou arbitrage automatique)
- `rouge` => blocage (ne pas exporter / ne pas publier tant que non résolu)

## Plan d’exécution (industrialisation)

### Jobs
- Un job d’audit parcourt les événements et écrit dans `evenements_audit`.
- Le job doit être :
  - reprenable (resume)
  - rate-limit aware
  - parallélisable mais contrôlé

### Recommandation de workflow
1. Sélectionner un batch d’événements non audités (ou audit_version > version courante).
2. Exécuter SCOREUR.
3. Exécuter BLIND_DATER.
4. Comparer (code) => statut.
5. Si `orange/rouge`, exécuter ARBITRE.
6. Exporter un rapport (JSON/CSV) :
   - top erreurs
   - distribution delta
   - items à corriger

## Cas difficiles (checklist)
- Dates BCE / années négatives.
- Dates “circa”, périodes, règnes, guerres (plutôt qu’un jour précis).
- Homonymes (ex: “Traité de Paris” multiple).
- Changements de calendrier (Julien/Gregorien) si tu vas très ancien.
- Événements récurrents (Jeux Olympiques, élections) => bien qualifier l’édition.

## Non-objectifs (pour éviter de casser le produit)
- Ne pas introduire de dépendance runtime dans l’app RN.
- Ne pas corriger automatiquement la table `evenements` sans validation.

---

# Proposition de migration (structure future) — sans déplacer de fichiers maintenant

Objectif : préparer une organisation “feature-first” dans `src/features/` pour rendre l’app plus maintenable.

Proposition de dossiers à créer :
- `src/features/auth/`
  - login/signup, session, guard, guest mode
- `src/features/supabase/`
  - client, types DB, services/repositories
- `src/features/gameplay/`
  - logique jeu classique (hooks, engine, selectors)
- `src/features/precision-mode/`
  - logique mode précision (hooks, scoring, timers)
- `src/features/events/`
  - lecture catalogue `evenements`, formatage dates, caching, intégrité
- `src/features/leaderboards/`
  - scores, rewards, ranking
- `src/features/quests/`
  - daily/weekly/monthly, progress
- `src/features/ads/`
  - consentement, ad units, rewarded/interstitial
- `src/features/analytics/`
  - wrappers FirebaseAnalytics, conventions events/errors
- `src/features/admin/`
  - outils internes (ex: validation), derrière RLS (pas UI-only)
- `src/shared/ui/`
  - composants UI génériques (buttons, modals, typography)
- `src/shared/utils/`
  - helpers purs (dates, formatting, guards)

Notes :
- On crée la structure d’abord, puis on migre écran par écran, sans refonte globale.
