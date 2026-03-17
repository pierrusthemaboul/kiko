# 🚦 État des Accès & Outils Timalaus

> **Mise à jour : 12 Janvier 2026**
> Ce document valide ce que les agents peuvent TOUCHER et VOIR.

## ✅ Feux Verts (Accès confirmés)

1.  **Supabase (Données Jeu)**
    *   **Accès** : Lecture/Écriture.
    *   **Outil Agent** : `get_kpi_stats.js` (Testé OK).
    *   **Utilisateur** : Jade, Marc.

2.  **Google Play Console (Boutique)**
    *   **Accès** : Lecture (Avis, Fiche).
    *   **Technique** : Service Account `play-console-api@...` configuré.
    *   **Script** : `fetch-play-console-stats.ts` (Dispo).
    *   **Utilisateur** : Jade, Tom (Support).

3.  **TikTok (Marketing Viral)**
    *   **Accès** : API configurée (`clientKey` présente).
    *   **Utilisateur** : Nina (Vidéo), Hugo (Social).

4.  **Firebase & AdMob (Analytics/Revenus)**
    *   **Accès** : Admin SDK présent.
    *   **Utilisateur** : Jade.

## ⚠️ Feux Oranges (Configuration à finir)

1.  **Google Ads (Publicité)**
    *   **Statut** : Pas de credentials API trouvés dans le dossier.
    *   **Solution** : Gestion manuelle via Interface Web pour l'instant.
    *   **Impact** : Marc ne peut pas voir le CPC en temps réel.

2.  **Outils ASO (AppFollow / MobileAction)**
    *   **Statut** : Comptes non créés (d'après le rapport).
    *   **Impact** : Analyse concurrence limitée.

## 🔴 Feux Rouges (Manquant)

*   *Aucun bloqueur majeur identifié pour le lancement.*

---
**Verdict** : L'infrastructure est suffisante pour lancer la "Saison 1" de l'entreprise virtuelle.
