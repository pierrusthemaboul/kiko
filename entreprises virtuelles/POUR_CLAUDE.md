# POUR CLAUDE - Contexte pour nouvelle session

## Modèle recommandé: **Claude Sonnet**

### Pourquoi Sonnet plutôt qu'Opus?
- **Coût**: ~5x moins cher qu'Opus
- **Rapidité**: Réponses plus rapides
- **Suffisant**: La tâche est principalement de l'exécution/configuration, pas de l'analyse complexe
- **Opus**: Réserver pour les tâches d'architecture ou d'analyse complexe

---

## Contexte du projet

### Ce qui a été fait (session précédente avec Opus)
1. **Pipeline de production TikTok fonctionnel** via l'agent CHLOE
2. **Vidéo publiable créée**: `tiktok.mp4` (30s, 6.8MB)
3. **Assets configurés**: Badge TIMALAUS + Badge Google Play
4. **Collaboration Claude-Gemini** via fichiers `POUR_GEMINI.md`

### Fichier vidéo prêt
```
entreprises virtuelles/K_HIVE/AGENTS/CHLOE/STORAGE/OUTPUT/tiktok.mp4
```

---

## Architecture des agents (Entreprises Virtuelles)

### Hiérarchie K-HIVE
```
LOUIS (CEO) - Supervise KPIs, émet directives
    ↓
HUGO (Head of Social) - Coordonne les équipes
    ├── TikTok Team:
    │   ├── MARC (Stratège) - Sélectionne clips + hooks
    │   ├── CHLOE (Production) - Montage vidéo FFmpeg
    │   └── LEA (QA) - Valide et déplace vers PRET_A_PUBLIER
    │
    └── Twitter Team:
        └── JEAN (Production) - Création tweets
```

### Hiérarchie REPORTERS_UNIT
```
TOM (Capture) - Enregistre le gameplay mobile
    ↓
DERUSH (Découpage) - Découpe en clips
```

### Flux complet
```
TOM → DERUSH → MARC → CHLOE → LEA → PRET_A_PUBLIER → [PUBLICATION]
```

---

## Tâche pour cette session

### Objectif
Publier la vidéo `tiktok.mp4` sur TikTok.

### Questions à résoudre

1. **Agent de publication**: LEA valide et déplace vers `PRET_A_PUBLIER/`, mais qui publie effectivement?
   - Option A: LEA publie aussi (ajouter capability)
   - Option B: Nouvel agent "PUBLISHER" ou "SOCIAL_POSTER"
   - Option C: HUGO publie (il coordonne)

2. **API TikTok**: Comment publier automatiquement?
   - TikTok Content Posting API (nécessite approbation)
   - TikTok for Developers
   - Alternative: Préparer le fichier + description, publication manuelle

3. **Processus décisionnel**: Est-ce la bonne architecture?
   - Actuellement: LOUIS décide mais n'a pas de données (2 joueurs, 0 publications)
   - Court terme: Simplifier, ignorer LOUIS/HUGO, pipeline direct
   - Long terme: Quand il y aura des KPIs, LOUIS pourra prendre des décisions

---

## État actuel de LEA

LEA fait actuellement:
1. Vérifie durée (10-60s) ✓
2. Vérifie taille fichier ✓
3. Déplace vers `PRET_A_PUBLIER/TIKTOK/` ou `REJECTED/`

LEA ne fait PAS:
- Publication sur TikTok
- Génération de description/hashtags
- Appel API externe

---

## Fichiers importants

| Fichier | Description |
|---------|-------------|
| `entreprises virtuelles/orchestrateur.js` | Pipeline complet |
| `K_HIVE/AGENTS/LEA/agent.js` | Validation QA |
| `K_HIVE/AGENTS/CHLOE/agent.js` | Production vidéo |
| `PRET_A_PUBLIER/TIKTOK/` | Destination finale |
| `POUR_GEMINI.md` | Communication avec Gemini |

---

## Collaboration avec Gemini

Gemini (sur Antigravity) peut:
- Exécuter des commandes bash
- Modifier des fichiers
- Utiliser un navigateur (avec prudence - cause des freezes)
- Générer des images (DALL-E)

Pour communiquer avec Gemini:
1. Créer/modifier `POUR_GEMINI.md`
2. Pierre partage le fichier dans Antigravity
3. Gemini répond via fichiers `GEMINI_*.md`

---

## Décisions à prendre

### Court terme (cette session)
1. [ ] Valider la vidéo via LEA
2. [ ] La déplacer vers `PRET_A_PUBLIER/TIKTOK/`
3. [ ] Préparer description + hashtags pour TikTok
4. [ ] Documenter le processus de publication manuelle

### Moyen terme
1. [ ] Investiguer l'API TikTok Content Posting
2. [ ] Décider si on crée un agent PUBLISHER
3. [ ] Automatiser la publication si possible

---

## Commandes utiles

```bash
# Lancer LEA pour valider la vidéo
cd "entreprises virtuelles/K_HIVE/AGENTS/CHLOE/STORAGE/OUTPUT"
cp tiktok.mp4 ../../LEA/STORAGE/INPUT/
cd ../../LEA && node agent.js

# Vérifier le contenu de PRET_A_PUBLIER
ls -la "entreprises virtuelles/PRET_A_PUBLIER/TIKTOK/"

# Lancer le pipeline complet
cd "entreprises virtuelles" && node orchestrateur.js --tiktok
```

---

## Notes importantes

1. **Quota Claude**: La session précédente a consommé ~64% du quota (Opus est coûteux)
2. **Anti-freeze Gemini**: Limiter à 2 onglets navigateur, préférer curl/wget
3. **Pas de données KPIs**: LOUIS/HUGO sont utiles mais pas encore pertinents
4. **Simplicité**: Focus sur publier cette vidéo, pas sur l'architecture parfaite

---

*Document préparé par Claude Opus - 17 janvier 2026*
*Pour utilisation avec Claude Sonnet dans la prochaine session*
