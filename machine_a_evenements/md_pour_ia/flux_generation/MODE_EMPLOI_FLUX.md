# 🎨 Mode d'Emploi Flux-Schnell

**Guide de bonnes pratiques pour générer des images historiques réalistes avec Flux-Schnell**

*Mis à jour au fur et à mesure des découvertes*

---

## 🚨 Découverte Majeure #1: Le Paradoxe des Negative Prompts

**Date**: 31 janvier 2026
**Problème**: Les statues ailées, anges, et dragons apparaissent malgré les negative prompts

### ❌ Ce qui NE fonctionne PAS

```javascript
// MAUVAISE APPROCHE
const prompt = "1961, historical scene, Berlin Wall construction";
const negatives = "no statues, no winged figures, no angels";
const finalPrompt = `${prompt}. Strictly avoid: ${negatives}`;
```

**Pourquoi ça échoue:**

1. **Flux n'a pas de canal "Negative Prompt" natif**
   - Contrairement à Stable Diffusion (SDXL), Flux utilise T5-XXL
   - T5 est entraîné sur des descriptions **positives**
   - Il ne comprend pas la négation logique comme un humain

2. **L'effet d'insistance ("Éléphant Rose")**
   - En écrivant `no winged statues`, le modèle "voit" fortement les tokens `winged` et `statues`
   - Vous **renforcez** la présence sémantique du concept dans l'espace latent
   - Résultat: Flux génère exactement ce que vous vouliez éviter!

3. **Le bug "Strictly avoid"**
   - Pour Flux, `Strictly avoid: no statues` est juste une phrase de plus
   - Il **associe les concepts** au lieu de les éviter
   - À 4 steps, il n'a pas le temps de corriger → il va au "cliché" le plus proche

### ✅ La Solution: Stratégie "Positive Only"

**Principe**: Ne jamais dire ce qu'on ne veut PAS, mais décrire ce qu'on VEUT de façon incompatible.

```javascript
// BONNE APPROCHE
const prompt = `1961, historical Berlin Wall construction,
candid documentary photography, real skin textures, motion blur,
natural outdoor lighting, authentic muddy ground,
high-fidelity cinematic photography, realistic textures,
detailed surroundings, authentic historical atmosphere`;

// PAS de section "Strictly avoid" !
```

**Pourquoi ça fonctionne:**

- Une **statue n'a pas de "skin texture"** ou de "motion blur"
- En forçant ces attributs, vous rendez l'apparition d'une statue **statistiquement improbable**
- Vous **occupez l'espace sémantique** avec des concepts incompatibles

---

## 🎯 Règles d'Or pour Flux-Schnell (4 steps)

### Règle #1: Purgez les mots interdits

❌ **JAMAIS mentionner le concept que vous voulez éviter**
- Si vous ne voulez pas de statues → le mot "statue" ne doit **nulle part** apparaître
- Si vous ne voulez pas de dragons → ne jamais écrire "dragon"

✅ **À la place**: Décrivez l'alternative positive
- Au lieu de "no statues" → "candid street photography, real people, motion blur"
- Au lieu de "no angels" → "documentary style, authentic human figures, natural poses"

### Règle #2: Ancrez le médium photographique

**Forcez le style documentaire:**
```
National Geographic photography style
Live action movie scene
Documentary photograph from [year]
Photojournalism from the [decade]
```

**Pourquoi?** Les statues ne sont pas dans les documentaires/reportages. En ancrant le médium, vous évitez le style "Musée/Monument".

### Règle #3: Occupez l'arrière-plan

❌ **Ne pas laisser d'espace vide sémantique**
```
"Berlin Wall, 1961" → Flux invente des statues pour "remplir"
```

✅ **Décrivez précisément le décor**
```
"Berlin Wall, 1961, background composed of wooden houses,
smoke from campfires, military trucks, barbed wire fencing,
concrete slabs under construction"
```

### Règle #4: Détails physiques incompatibles

**Ajoutez des attributs que les statues ne peuvent pas avoir:**
- `motion blur` (les statues ne bougent pas)
- `real skin textures` (les statues sont en pierre/métal)
- `natural breathing` (les statues ne respirent pas)
- `candid moment` (les statues sont posées)
- `muddy ground` (ancre le réalisme physique)

---

## 📊 Problèmes Spécifiques Identifiés

### Problème #1: Statues Ailées (50% des images)

**Cause**: Biais de domaine de Flux
- `Histoire + Événement + Antiquité/Moyen-Âge` = Style épique/monumental
- Le modèle a été entraîné sur des "peintures d'histoire" et "monuments"
- Les statues et allégories ailées sont omniprésentes dans ce corpus

**Solution**:
```javascript
// Au lieu de décrire l'événement de façon abstraite:
"Historical political event, 1961"

// Ancrez le support physique:
"Black and white press photograph, 1961, handheld camera grain,
photojournalist perspective, real people in motion,
authentic street scene, no artistic monuments"
```

### Problème #2: Variabilité des Styles

**Observation**: Même "style block" → styles très différents (N&B, sépia, couleur)

**Cause**: À 4 steps, Flux-Schnell interprète selon le contenu:
- Jungle → sépia automatique
- Chine + Mao → rouge intense
- URSS → noir & blanc austère

**Solution**: Forcer explicitement la palette
```javascript
// Ajoutez AVANT le reste du prompt:
"MANDATORY PALETTE: strict black and white photography,
silver gelatin print, no sepia tone, no color tints,
monochrome only"
```

### Problème #3: Objets Modernes (smartphones, etc.)

**Cause**: Flux associe "foule" ou "manifestation" avec "téléphones"

**Solution**: Ancrer l'époque avec objets spécifiques
```javascript
// Au lieu de juste la date:
"1953, Stalin's death"

// Précisez les objets de l'époque:
"1953, Stalin's death, people holding newspapers (not phones),
film cameras with flash bulbs, vintage microphones,
period-accurate clothing with wool coats and fur hats"
```

---

## 🛠️ Modifications Recommandées du Code

### Dans sevent3.mjs

**AVANT** (ligne ~2796):
```javascript
const negatives = buildNegativePrompt(baseNegative, event.year, event);
const finalPrompt = `${prompt}. Strictly avoid: ${negatives}`;
```

**APRÈS** (Stratégie Positive Only):
```javascript
// Construction d'attributs positifs incompatibles avec les erreurs communes
const positiveAnchors = [
    "candid documentary photography",
    "authentic real textures",
    "photojournalist perspective",
    "natural motion blur",
    "genuine historical atmosphere",
    "live action scene",
    "no artistic embellishments"
].join(', ');

const finalPrompt = `${prompt}, ${positiveAnchors}`;
// Plus de section "Strictly avoid" !
```

### Forcer la Palette Monochrome

**Pour événements 1900-1970:**
```javascript
if (year >= 1900 && year <= 1970) {
    const monochromeForce = "MANDATORY: strict black and white photography, silver gelatin print, monochrome only, no sepia, no color";
    finalPrompt = `${monochromeForce}. ${finalPrompt}`;
}
```

---

## 📈 Stratégies par Époque

### Antiquité (0-500): Éviter les statues grecques/romaines

**Problème**: Flux génère des statues partout (Zeus, Athéna, etc.)

**Solution**:
```
"candid moment in ancient Rome, real people in togas,
street scene with vendors and children,
muddy forum ground, live action, no monuments,
documentary style as if filmed by time traveler"
```

### Moyen-Âge (500-1500): Éviter les décorations gothiques

**Problème**: Gargouilles, statues de saints, ornements religieux

**Solution**:
```
"medieval documentary photograph, common people at work,
muddy courtyard, wooden tools in use,
authentic daily life scene, no cathedral decorations"
```

### XXe siècle (1900-1970): Éviter Art Déco / Monuments

**Problème**: Statues Art Déco, monuments commémoratifs

**Solution**:
```
"press photography [year], handheld camera grain,
street level perspective, real people in period clothing,
no monuments, photojournalism style,
authentic urban scene with period vehicles"
```

---

## 🧪 Tests à Faire

**Hypothèses à valider:**

1. ✅ **Suppression totale des negative prompts** réduit-elle les statues?
2. ⏳ **Augmentation des steps** (4 → 8-12): amélioration de la précision?
3. ⏳ **Ancrage médium** ("National Geographic style"): efficacité mesurable?
4. ⏳ **Occupation de l'arrière-plan**: réduit-elle les "remplissages" fantastiques?

---

## 📝 Template de Prompt Optimal (Flux-Schnell 4 steps)

```javascript
const buildOptimalFluxPrompt = (event) => {
    const { year, titre, lieu, type } = event;

    // 1. Palette forcée (si nécessaire)
    let palette = "";
    if (year >= 1900 && year <= 1970) {
        palette = "MANDATORY: strict black and white photography, monochrome only. ";
    }

    // 2. Médium + Perspective
    const medium = "Documentary photograph, photojournalist perspective, handheld camera grain";

    // 3. Attributs anti-statues
    const antiStatue = "real skin textures, natural motion blur, candid moment, live action";

    // 4. Ancrage physique
    const physical = "authentic muddy ground, period-accurate clothing in use, genuine historical atmosphere";

    // 5. Contenu spécifique
    const content = `${year}, ${titre}, ${lieu}`;

    // 6. Détails de l'arrière-plan (occuper l'espace sémantique)
    const background = "background with period buildings, vintage vehicles, era-appropriate objects";

    return `${palette}${medium}, ${content}, ${antiStatue}, ${physical}, ${background}`;
};
```

---

## 🚨 Découverte Majeure #2: Paramètres Replicate Optimaux

**Date**: 31 janvier 2026
**Source**: Analyse experte Gemini + Tests sur jeu mobile Timalaus

### 🎮 Contrainte Mobile: Format d'Affichage

Les images sont affichées dans le jeu mobile Timalaus en format **carte portrait verticale**. Le ratio 16:9 horizontal actuel crée deux problèmes:

1. **Recadrage mobile**: L'image est rognée sur mobile → perte d'informations
2. **Espace vide horizontal**: Flux "remplit" les bords avec des statues/décorations

**Solution**: Ratio dynamique selon le type d'événement.

### ⚙️ Paramètres Critiques à Optimiser

#### 1. **Guidance Scale: Le Coupable #1 des Statues**

**Problème actuel**: `guidance_scale: 3.5` (fixe)

À 4 steps, une guidance de 3.5 force Flux à utiliser ses **concepts les plus robustes** = ses clichés. Les statues ailées sont le "cliché par défaut" de "Histoire" dans son corpus d'entraînement.

**Solution**:
```javascript
// Guidance dynamique par époque
const guidanceScale = (event.year < 1500) ? 2.0 :
                      (event.year < 1900) ? 2.5 : 3.0;
```

**Pourquoi?**
- **Antiquité/Médiéval (< 1500)**: Guidance 2.0 laisse le modèle "respirer" → moins de clichés de statues grecques/romaines
- **Moderne (> 1900)**: Guidance 3.0 suffit (corpus photo plus riche)

**Coût**: Gratuit, changement immédiat

---

#### 2. **Output Quality: Artifacts = Faux Positifs Gemini**

**Problème actuel**: `output_quality: 90` (WebP)

Les artifacts de compression WebP dans les zones sombres/floues peuvent être interprétés par Gemini Vision comme des "objets surnaturels" (faux positifs).

**Solution**:
```javascript
output_quality: 95  // Au lieu de 90
```

**Pourquoi?**
- Clarté des textures textiles cruciale pour validation Gemini
- WebP reste optimal pour le poids (mobile)
- Alternative: JPG à 95 pour tests de validation

**Coût**: +10-15% poids fichier, validation plus fiable

---

#### 3. **Aspect Ratio: Le Point Sous-Estimé**

**Problème actuel**: `aspect_ratio: "16:9"` (fixe horizontal)

**Analyse critique**:
- En 16:9, si le prompt décrit une action centrale (signature de traité, portrait), Flux a **horreur du vide** sur les côtés
- Sans instructions précises pour le décor latéral, Flux remplit automatiquement avec **colonnes et statues**
- Sur mobile portrait, l'image est de toute façon recadrée!

**Solution**:
```javascript
// Ratio dynamique par type
const aspectRatio = (event.type === 'Politique' ||
                     event.type === 'Religion' ||
                     hasPortrait) ? "4:3" : "16:9";
```

**Cas d'usage**:
- **4:3**: Portraits (JFK, Staline), scènes intérieures (signature de traité)
- **16:9**: Batailles, paysages, scènes de foule
- **1:1**: Objets isolés (inventions, découvertes scientifiques)

**Impact**: Réduction mécanique des hallucinations de décor (-30% estimé)

---

#### 4. **Seed Management: Reproductibilité**

**Problème actuel**: `seed: Math.floor(Math.random() * 1000000)` (totalement aléatoire)

**Solutions**:
```javascript
// Option A: Seed déterministe par époque (reproductible)
const seed = hashCode(`${event.year}-${event.type}`) % 1000000;

// Option B: Seed incrémental pour retry (variations contrôlées)
const seed = baseSeed + (attemptNumber * 1000);

// Option C: Registry des seeds réussis
if (validationSuccess) {
    await storeSeed(event.titre, seed, guidanceScale);
}
```

**Avantages**:
- Debugging: "Le seed +1000 donne des aigles, +2000 est clean"
- Réutilisation: Réappliquer un bon seed sur événements similaires

---

### 🚫 Confirmations Importantes (Replicate API)

#### **Flux ne supporte PAS `negative_prompt` séparé**

**Vérité technique**: Replicate ne propose **pas** de paramètre `negative_prompt` pour Flux car le modèle ne le supporte pas nativement (contrairement à SDXL).

**Conséquence**: Concaténer `"Strictly avoid: ${negatives}"` dans le prompt est **contre-productif**:
- Ajoute les tokens interdits (ex: "statue") dans la fenêtre d'attention
- À 4 steps, pas de temps pour "corriger" → génère exactement ce qu'on voulait éviter

**Action**: Suppression totale des negatives (voir Découverte #1)

---

#### **Img2Img / Image Reference ne fonctionne PAS**

**Problème actuel**: Ligne 3169 de sevent3.mjs envoie l'URL de l'image précédente dans le prompt texte.

**Vérité technique**: Flux sur Replicate (version standard) ne supporte pas:
- `image` parameter en img2img pur
- Référence d'URL dans le texte (Flux ne sait pas "regarder" une URL)
- ControlNet sans modèle spécifique (Canny/Depth)

**Solution pour retry**:
```javascript
// Au lieu de référencer l'image précédente
// → Changer l'angle de vue pour "casser" la génération
if (attemptNumber > 1) {
    const newPerspective = attemptNumber === 2 ? "close-up shot" : "wide-angle view";
    prompt = `${prompt}, ${newPerspective}`;
}
```

---

### 💰 Budget & Coûts Replicate (Janvier 2026)

**Coûts estimés**:
- **Flux-Schnell** (4 steps): ~$0.003/image
- **Flux-Dev** (20 steps): ~$0.015-0.030/image (5-10x plus cher)
- **Flux-Pro**: ~$0.05-0.10/image (ultra-précis, 15-30x plus cher)

**Stratégie budgétaire pour 10 000 images**:

1. **Schnell par défaut** (90% des images)
   - Coût: 9 000 × $0.003 = **$27**
   - Rapide, bon pour paysages et scènes simples

2. **Dev comme "Heavy Retry"** (10% - échecs Schnell)
   - Coût: 1 000 × $0.020 = **$20**
   - Seulement si Schnell échoue 2× (statues persistantes)

3. **Total estimé**: $47 pour 10 000 images
   - vs $200+ si tout en Dev
   - vs $500+ si tout en Pro

---

### 🛠️ Code Optimisé pour sevent3.mjs

**Remplacer la fonction `generateImageEnhanced` (ligne ~2778)**:

```javascript
async function generateImageEnhanced(promptData, event) {
    if (OFFLINE) {
        const prompt = typeof promptData === 'string' ? promptData : promptData.prompt;
        console.log('🎨 [DEBUG] OFFLINE mode — skipping image generation');
        return `offline://image/${encodeURIComponent(event.titre || 'image')}`;
    }

    const prompt = typeof promptData === 'string' ? promptData : promptData.prompt;
    const modelName = 'flux-schnell';

    // 🎯 OPTIMISATION #1: Guidance dynamique par époque
    const guidanceScale = (event.year < 1500) ? 2.0 :
                          (event.year < 1900) ? 2.5 : 3.0;

    // 🎯 OPTIMISATION #2: Aspect ratio dynamique
    const hasPortrait = event.type === 'Politique' ||
                        event.type === 'Religion' ||
                        event.titre.toLowerCase().includes('portrait');
    const aspectRatio = hasPortrait ? "4:3" : "16:9";

    console.log(`🎨 [DEBUG] Début génération Flux-Schnell`);
    console.log(`🎨 [DEBUG] Prompt: "${prompt}"`);

    // 🎯 OPTIMISATION #3: PLUS de "Strictly avoid" (voir Découverte #1)
    // Stratégie Positive Only uniquement
    const finalPrompt = prompt;  // Pas de concaténation de negatives!

    const fluxConfig = {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        num_inference_steps: 4,
        output_format: "webp",
        output_quality: 95,  // 🎯 OPTIMISATION #4: Qualité augmentée
        seed: FLUX_CONFIG.seed(),
        guidance_scale: guidanceScale
    };

    console.log(`🎨 [DEBUG] Config: steps=4, quality=95, guidance=${guidanceScale}, ratio=${aspectRatio}`);

    // ... reste du code Replicate inchangé
}
```

---

### 🎯 Priorité d'Implémentation

**Ordre recommandé** (gratuit → facile → complexe):

1. ✅ **Supprimer les negatives** (ligne 2796)
   - Coût: Gratuit
   - Temps: 5 minutes
   - Impact: -40% de statues estimé

2. ✅ **Guidance scale dynamique** (2.0/2.5/3.0)
   - Coût: Gratuit
   - Temps: 5 minutes
   - Impact: -30% de clichés antiquité

3. ✅ **Output quality → 95**
   - Coût: +10% poids fichier
   - Temps: 2 minutes
   - Impact: Meilleure validation Gemini

4. ✅ **Aspect ratio dynamique**
   - Coût: Gratuit
   - Temps: 10 minutes (détection portrait)
   - Impact: -30% hallucinations décor + meilleur affichage mobile

5. ⏳ **Seed registry** (optionnel)
   - Coût: Gratuit
   - Temps: 30 minutes (DB schema)
   - Impact: Reproductibilité + debugging

**Total temps d'implémentation**: 22 minutes pour les 4 premiers
**Impact cumulé estimé**: -60 à -70% de statues ailées

---

## 🔄 Changelog

**31 janvier 2026 - Session 1**
- Découverte du paradoxe des negative prompts
- Identification du biais "Statues Ailées" (50% des images)
- Stratégie "Positive Only" recommandée par Gemini
- Règle #1: Purger les mots interdits
- Règle #2: Ancrer le médium photographique
- Règle #3: Occuper l'arrière-plan
- Règle #4: Détails physiques incompatibles

**31 janvier 2026 - Session 2**
- Analyse contrainte mobile (Timalaus) → ratio dynamique nécessaire
- Guidance scale dynamique par époque (2.0/2.5/3.0)
- Output quality 90 → 95 (artifacts WebP)
- Aspect ratio 16:9 fixe → dynamique 4:3/16:9/1:1
- Confirmation: Replicate Flux ne supporte PAS negative_prompt séparé
- Confirmation: Img2img / Image reference ne fonctionne PAS
- Budget Replicate: $0.003/image Schnell, $0.020/image Dev
- Problème 16:9: Flux "remplit les bords" avec statues si vide sémantique
- Code optimisé: 4 optimisations pour -60 à -70% de statues

---

**À compléter au fur et à mesure des découvertes...**
