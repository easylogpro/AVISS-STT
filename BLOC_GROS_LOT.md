# Gros lot : adresse, réf 5246TX, tableaux, fiche client, sous-traitants, mails

## 1. SQL (Supabase SQL Editor) — si besoin
- **06_st_delete.sql** : à exécuter pour pouvoir modifier/supprimer les sous-traitants.

## 2. Déployer l'app + les mails (Git Bash, dossier aviss-stt)
```bash
git add .
git commit -m "Adresse, ref 5246TX, tableaux scroll, fiche client, ST modif/suppr, mails"
git push
supabase functions deploy send-emails --no-verify-jwt
```

## Ce qui change
- Référence partout au format **5246TX100222** (n° site + TX + n° travaux), app ET mails.
- Champ **adresse (rue)** éditable dans la fiche (admin) + déjà dans le formulaire.
- **Tableaux** ST et Admin : défilement horizontal pour voir toutes les colonnes (statut compris).
- **Fiche côté sous-traitant** : bloc CONTACT CLIENT avec tél + adresse complète.
- **En-tête site (vue carte)** : fond bleu foncé, texte blanc, statut à droite.
- **Barre du bas** plus compacte.
- **Sous-traitants (admin)** : boutons Modifier (nom/email) et Supprimer (définitif).
- **Mail au sous-traitant** : adresse complète + téléphone du client.

⚠ PWA : après déploiement, recharge fort ou réinstalle l'icône sur le téléphone.
