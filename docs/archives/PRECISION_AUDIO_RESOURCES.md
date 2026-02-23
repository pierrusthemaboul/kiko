# 🎵 Ressources Audio - Suggestions d'amélioration

## Sons actuellement utilisés

Tous les sons sont déjà présents dans `/assets/sounds/` et fonctionnent correctement.

## Suggestions de sons supplémentaires (libres de droits)

### Musique d'ambiance

Pour ajouter une musique de fond au mode Précision, voici des suggestions de sites avec des musiques steampunk/historiques libres de droits :

#### Freesound.org (Creative Commons)
- **Recherche suggérée** : "steampunk ambient loop"
- **Filtres** : License CC0 ou CC-BY
- **Exemples** :
  - Musique de fond mécanique/industrielle
  - Ambiance de musée
  - Musique d'horloge/engrenages

#### Autres sources
- **Pixabay** (https://pixabay.com/music/) - Musiques libres de droits
  - Recherche : "steampunk", "vintage", "historical"
- **Uppbeat** (https://uppbeat.io/) - Musique gratuite pour créateurs
- **Free Music Archive** - Musique libre

### Sons d'interface additionnels

#### Pour les variations de touches
Si vous voulez différents sons pour différentes touches :

**Freesound.org**
- Recherche : "mechanical keyboard click" + filter CC0
- Recherche : "typewriter key" pour un effet vintage
- Recherche : "button press soft"

#### Son de combo/série
Pour récompenser les bonnes réponses consécutives :

**Freesound.org**
- Recherche : "achievement unlock"
- Recherche : "success ding"
- Recherche : "coin collect" pour un son léger

### Sons de chronomètre améliorés

#### Tick d'horloge mécanique
**Freesound.org**
- `modusmogulus/sounds/790486/` - Clock Tick 10sec (CC0)
- `FlashTrauma/sounds/398275/` - Clock Tick
- `InspectorJ/sounds/343130/` - Ticking Clock, A.wav

#### Alarme finale
- Recherche : "alarm clock ring vintage"
- Recherche : "bell chime"

### Sons de période historique

Pour ajouter du contexte selon la période de l'événement :

#### Antiquité (-3000 à 500)
- Sons de cloche, gong, instruments anciens
- Recherche : "ancient bell", "bronze chime"

#### Moyen Âge (500-1500)
- Cloches d'église, cors
- Recherche : "church bell", "medieval horn"

#### Renaissance/Baroque (1500-1800)
- Clavecin, viole de gambe
- Recherche : "harpsichord note", "baroque instrument"

#### Époque moderne (1800-1950)
- Klaxon vintage, machines à vapeur
- Recherche : "vintage car horn", "steam engine"

#### Époque contemporaine (1950+)
- Sons électroniques, synthé
- Recherche : "synth pop sound", "electronic blip"

## Comment télécharger et intégrer de nouveaux sons

### 1. Téléchargement

Pour télécharger depuis Freesound.org :
```bash
# Exemple avec wget
wget -O /home/pierre/kiko/assets/sounds/nouveau_son.wav "https://freesound.org/data/previews/.../sound.wav"
```

### 2. Ajout au hook usePrecisionAudio

Éditez `/hooks/game/usePrecisionAudio.ts` :

```typescript
const soundPaths = {
  // ... sons existants ...

  // Nouveau son
  nouveauSon: require('../../assets/sounds/nouveau_son.wav'),
};
```

Puis créez une fonction pour le jouer :

```typescript
const playNouveauSon = useCallback(() => {
  playSound('nouveauSon', 0.6); // Ajustez le volume
}, [playSound]);

// N'oubliez pas de l'exporter
return {
  // ... exports existants ...
  playNouveauSon,
};
```

### 3. Utilisation dans le composant

Dans `PrecisionGameContent.tsx` :

```typescript
// Ajoutez un effet ou un callback
useEffect(() => {
  // Condition de déclenchement
  if (condition) {
    precisionAudio.playNouveauSon();
  }
}, [dépendances]);
```

## Formats audio recommandés

- **WAV** : Meilleure qualité, fichiers plus gros
  - Parfait pour les sons courts (< 2s)

- **MP3** : Bonne qualité, fichiers compressés
  - Parfait pour la musique d'ambiance

- **OGG** : Alternative à MP3, bonne compression
  - Bien supporté sur Android

## Optimisation des fichiers audio

Pour réduire la taille des fichiers :

```bash
# Conversion WAV → MP3 (si ffmpeg installé)
ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 2 output.mp3

# Réduction du bitrate
ffmpeg -i input.mp3 -b:a 128k output.mp3

# Normalisation du volume
ffmpeg -i input.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.wav
```

## Licences Creative Commons - Rappels

- **CC0** : Domaine public, utilisation libre sans attribution
- **CC-BY** : Utilisation libre avec attribution requise
- **CC-BY-SA** : Attribution + partage dans les mêmes conditions
- **CC-BY-NC** : Attribution + usage non-commercial uniquement

Pour un projet commercial, privilégiez CC0 et CC-BY.

## Crédits actuels

Les sons utilisés actuellement proviennent de :
- Freesound.org (utilisateur japanyoshithegamer)
- Freesound.org (utilisateur ohforheavensake)
- Freesound.org (utilisateur wagna)

Assurez-vous de vérifier les licences pour chaque son et d'ajouter les attributions nécessaires.
