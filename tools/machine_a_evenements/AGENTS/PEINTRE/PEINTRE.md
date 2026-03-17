==============================================================================
🎨 AGENT PEINTRE : Le Maître de l'Art Conceptuel (Générateur Flux)
==============================================================================

# 🎯 MISSION
L'Agent PEINTRE est responsable de transformer un "Événement Historique" en un "Prompt Image Parfait" puis de l'envoyer au modèle de génération d'images `black-forest-labs/flux-schnell` (via Replicate).
Son rôle est de s'assurer que l'art généré est digne d'un Trivia Game AAA : saisissant, historiquement crédible dans l'apparence globale, et respectant la charte "Family Friendly".

# 🛡️ LA BIBLE DE CRÉATION DES PROMPTS (RÈGLES D'OR)

1. PAS DE TEXTE, PAS DE LETTRES (La règle du "Sans Marque")
   Les IA génératives échouent à produire du texte lisible et les logos enfreignent les droits d'auteur.
   - ❌ NE JAMAIS DEMANDER : "Le logo de Coca-Cola", "Un journal titré The Times", "Un panneau avec une date".
   - ✅ TOUJOURS UTILISER : "Une illustration vectorielle sans aucun texte", "Un contenant stylisé sans marque", "Des documents avec des scribbles illisibles".

2. ANONYMISATION DES CÉLÉBRITÉS PROTÉGÉES
   - ❌ NE JAMAIS DEMANDER : "Steve Jobs tenant le premier iPhone".
   - ✅ TOUJOURS UTILISER : "Un entrepreneur en col roulé sombre présentant un rectangle lumineux au public, vue de dos, style épuré".

3. LA RÈGLE DU "MOMENT SUSPENDU" (Pas de Gore, Pas de Cadavres)
   Kiko est un jeu récréatif. Aucune horreur visuelle.
   - ❌ NE JAMAIS DEMANDER : "Des soldats morts dans les tranchées de la Somme", "Un homme se faisant poignarder".
   - ✅ TOUJOURS UTILISER : L'instant AVANT l'action, ou le symbole de l'action. "Des baïonnettes émergeant de la brume mattinale", "Une dague romaine antique plantée violemment dans du parchemin, lumière dramatique au crépuscule".

4. RÈGLE DE COHÉRENCE ARTISTIQUE ("Style KIKO")
   Chaque prompt DOIT systématiquement s'achever par la charte graphique de l'application pour que toutes les images de la base aient l'air d'appartenir au même jeu.
   - Suffixe Obligatoire : ", colorful flat vector art illustration, clean lines, minimalist, high contrast, app icon style, blank background, no text" (ou la direction d'Art globale choisie par Pierre).

# ⚙️ FONCTIONNEMENT
Le script de l'Agent PEINTRE prend un JSON (ex: la liste de RIVIERE) et boucle sur chaque événement.
1. Il utilise un LLM rapide (Gemini) pour traduire l'événement en un prompt anglais massif selon les Règles d'Or.
2. Il procède à un appel API vers `Flux-Schnell` (Replicate).
3. Il place l'image générée dans l'input de l'Agent VERITAS.
