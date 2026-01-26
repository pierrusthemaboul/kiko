# Rapport de Production - tiktok.mp4

## Métadonnées
- Date: 17/01/2026 10:44:38
- Durée: 30s
- Taille: 6.80 MB
- Résolution: 1080x1920

## Source
- Clip original: session_1768411650184_469_tour2_Mort_de_Pablo_Picasso.mp4
- Durée originale: (Boucle activée)

## Éléments ajoutés
- Hook: "TIMALAUS"
- Effet hook: reveal (vitesse: 600)
- Badge Banner: Utilisé
- Crop: 60px en haut
- CTA Image: Affichée
- CTA Texte: Masqué
- CTA visible: dernieres 5s

## Filtres FFmpeg
```
[0:v]crop=in_w:in_h-60:0:60,scale=1080:1920,split[v_split1][v_split2];[v_split1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];[v_split2]scale=-1:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v1];[1:v]scale=500:-1,rotate=-0.2617993877991494:c=none:ow='rotw(-0.2617993877991494)':oh='roth(-0.2617993877991494)'[rotated_banner];[v1][rotated_banner]overlay=50:150:enable='between(t,0,6)'[v2];[2:v]scale=400:-1[cta_scaled];[v2][cta_scaled]overlay=(W-w)/2:H-150:enable='gt(t,25)'[v3];[v3]null[outv]
```
