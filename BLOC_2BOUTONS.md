# 2 boutons séparés + traçabilité envoi client + FIX crash fiche

## ⚠ FIX IMPORTANT
Le crash "écran blanc au clic sur une fiche" est corrigé (un import manquait).

## 1. SQL (Supabase SQL Editor)
Exécute **07_envoi_client.sql** (ajoute la trace de la date d'envoi au client).

## 2. Déployer (Git Bash, dossier aviss-stt)
```bash
git add .
git commit -m "2 boutons valider/envoyer client, tracabilite, fix crash fiche"
git push
supabase functions deploy send-emails --no-verify-jwt
```

## Ce qui change
- **Fiche** : ne plante plus au clic (bug corrigé).
- **2 boutons distincts** sur les chantiers en attente :
  1. « Valider la date (prévenir le sous-traitant) » → mail au ST seulement.
  2. « Envoyer la date au client » → mail au client + statut passe à « Confirmé ».
- Le **mail au client a été retiré** du bouton de validation (il est maintenant sur le 2e bouton).
- **Traçabilité** : une fois le client prévenu, la fiche/carte affiche
  « ✓ Mail client envoyé le JJ/MM/AAAA à HHhMM ».
- Le **statut « Confirmé par client »** se déclenche à l'envoi du mail client (comme avant).
