# Arbre du Projet Kiko

Voici la structure simplifiée du projet (profondeur max 2 pour les outils).

```text
kiko/
├── mobile_app/            # Application Expo / React Native
│   ├── src/               # Code source
│   ├── assets/            # Images, sons, polices
│   ├── app/               # Expo Router (écrans)
│   ├── components/        # Composants UI
│   ├── hooks/             # Logique métier React
│   ├── services/          # Appels API / Supabase
│   └── tests/             # Tests unitaires
├── tools/                 # Outils de production (IA & Datasets)
│   ├── machine_a_evenements/  # Pipeline de génération d'événements
│   ├── usine_a_images/        # Pipeline de génération d'images (Stable Diffusion/Flux)
│   ├── galerie_dart/          # Gestion du dataset visuel
│   ├── entreprises_virtuelles/ # Outils marketing/IA
│   └── remote/                # Interfaces de contrôle à distance
├── scripts/               # Scripts utilitaires
│   ├── maintenance/       # Correction de bugs, backups, audits
│   ├── data/              # Traitement massif de données JSON/CSV
│   ├── mobile_app/        # Scripts de build et fix Android/iOS
│   └── sandbox/           # ZONE LIBRE : Scripts temporaires des agents
├── credentials/           # Secrets & Configs (Ignoré par Git)
│   ├── .env               # Variables d'environnement
│   └── *.json             # Clés API Google, Firebase, etc.
├── data/                  # Gros datasets (Ignoré par Git)
├── docs/                  # Documentation & Rapports
├── supabase/              # Backend (Migrations & SQL)
└── package.json           # Scripts globaux orchestrateurs
```
