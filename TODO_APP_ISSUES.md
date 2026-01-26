# 🐛 PROBLÈMES À INVESTIGUER - TIMALAUS

**Date** : 2025-11-24

---

## 🔴 PROBLÈME CRITIQUE : Image manquante

### Description
Lors d'une partie en Mode Classique, l'illustration de l'événement concernant **"Première ligne de métro de Paris"** ne s'est pas affichée.

### Impact
- Expérience utilisateur dégradée
- Impossible de jouer correctement si l'image ne charge pas
- Peut affecter d'autres événements historiques

### À investiguer
1. **Vérifier si l'image existe** dans les assets
   - Chercher dans `/assets/events/` ou `/assets/images/`
   - Nom du fichier lié à cet événement

2. **Vérifier la base de données Supabase**
   - Requête pour l'événement "Première ligne de métro de Paris"
   - Vérifier le champ `image_url` ou `image_path`
   - Vérifier si l'URL est valide

3. **Vérifier les logs de chargement d'image**
   - Regarder les logs React Native pour voir les erreurs
   - Vérifier si le composant `Image` reçoit bien l'URL

4. **Tester d'autres événements**
   - Vérifier si c'est un problème isolé ou généralisé
   - Lister tous les événements avec images manquantes

### Actions correctives possibles
- [ ] Re-télécharger/ajouter l'image manquante
- [ ] Corriger l'URL dans la base de données
- [ ] Ajouter une image placeholder pour les événements sans image
- [ ] Améliorer la gestion d'erreur de chargement d'images

### Priorité
🔴 **HAUTE** - Affecte le gameplay

---

## 📋 AUTRES TÂCHES À FAIRE

### Vidéo de démo TikTok
- [x] Ajouter le bouton "Partager sur TikTok" (Mode Précision)
- [x] Ajouter le bouton "Partager sur TikTok" (Mode Classique)
- [x] Créer le serveur webhook sandbox
- [ ] **REFAIRE l'enregistrement vidéo** (la première tentative n'a pas montré le clic sur le bouton TikTok)
- [ ] Enregistrer le dashboard sandbox
- [ ] Monter la vidéo finale
- [ ] Soumettre à TikTok Developers

### Après approbation TikTok
- [ ] Implémenter réellement TikTok Share Kit SDK
- [ ] Remplacer le mockup par une vraie intégration
- [ ] Tester le partage réel sur TikTok
- [ ] Publier la version 1.5.8 sur Play Store

---

## 📝 NOTES

- Le bouton TikTok fonctionne correctement (affiche l'alerte)
- L'app est stable, pas de crash
- Problème uniquement avec le chargement de certaines images

---

**Prochaine action** : Refaire la vidéo de démo en cliquant bien sur le bouton TikTok à la fin
