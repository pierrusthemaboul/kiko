# Documentation Kiko

## Guides techniques

### Audio
- [**AUDIO_MIGRATION_GUIDE.md**](./AUDIO_MIGRATION_GUIDE.md) - ⚠️ **IMPORTANT** : Guide de migration expo-audio SDK 52
  - Pourquoi nous utilisons `useAudioPlayer` au lieu de `createAudioPlayer`
  - Solution au bug "Value is undefined, expected an Object"
  - Pattern de migration pour les nouveaux sons

## Structure du projet

### Hooks audio
- `/hooks/useAudio.ts` - Mode de jeu Classique (5 sons)
- `/hooks/game/usePrecisionAudio.ts` - Mode de jeu Precision (10 sons)

### Fichiers concernés par la migration audio
Ces fichiers contiennent des commentaires pointant vers AUDIO_MIGRATION_GUIDE.md :
- `hooks/useAudio.ts`
- `hooks/game/usePrecisionAudio.ts`

## Avant de modifier l'audio

⚠️ **Lisez d'abord** [AUDIO_MIGRATION_GUIDE.md](./AUDIO_MIGRATION_GUIDE.md)

Résumé rapide :
- ✅ Utilisez `useAudioPlayer(soundPath)`
- ❌ N'utilisez PAS `createAudioPlayer(soundPath)` avec expo-audio 0.3.5

## Prochaines étapes

Lors de la migration vers Expo SDK 53 :
- Envisager l'upgrade vers expo-audio 1.0.14+ (version stable)
- `useAudioPlayer` continuera de fonctionner (pas de breaking change)
