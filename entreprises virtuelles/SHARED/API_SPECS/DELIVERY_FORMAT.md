# 📦 Format de Livraison : Reporters -> K-Hive

Tout manifest de livraison doit être un JSON nommé `session_ID_DELIVERY_MANIFEST.json` et contenir :
- **session_id**: String
- **clips**: Liste d'objets avec :
    - `filename`: Nom du clip
    - `tour`: Numéro du tour
    - `evenement`: { titre, date, notoriete }
    - `choix`: { reponse, correct, duree_reflexion }
- **sequences**: Liste de vidéos plus longues regroupant plusieurs événements.
