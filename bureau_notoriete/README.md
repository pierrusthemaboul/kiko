# Bureau de la Notoriété (NOTOREX)

Ce dossier contient les agents et scripts dédiés à la ré-évaluation fine de la notoriété des événements du projet Kiko.

## Philosophie
Contrairement à une évaluation purement historique, NOTOREX privilège la **Culture Populaire** et la **perception française**. Un événement peut être mineur historiquement mais majeur s'il a été immortalisé par le cinéma, la littérature ou les programmes scolaires français.

## Structure
- `AGENTS/NOTOREX.md` : Définition des critères (France-centric).
- `eval_notoriete.mjs` : Script de traitement par lot (Batch) via Gemini 2.0.

## Utilisation
Pour lancer une évaluation sur les 10 prochains événements sans score (ou à ré-évaluer) :
```bash
node bureau_notoriete/eval_notoriete.mjs
```

## Critères NOTOREX (Résumé)
1. **Culture Pop & Médias (40%)** : Films, séries, docu (Secrets d'Histoire).
2. **Savoir Scolaire (30%)** : Socle commun, héros nationaux.
3. **Impact & Langage (20%)** : Expressions françaises, unicité.
4. **Mémoire Urbaine (10%)** : Noms de rues, métros, places.
