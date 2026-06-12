# Mise à jour : budget+ratio, icônes, matériel, emails

## 1. SQL à exécuter dans Supabase (SQL Editor)
Exécute **05_mo_vendue.sql** (ajoute la MO vendue + sécurité : le sous-traitant
ne peut JAMAIS lire la MO ni le ratio).

## 2. Activer les emails (tu as déjà compte + clé Resend)
Dans Git Bash, dossier aviss-stt :
```bash
supabase secrets set RESEND_API_KEY=re_TA_CLE
supabase secrets set ADMIN_EMAIL=ton-email@aviss-securite.fr
supabase secrets set "MAIL_FROM=AVISS STT <onboarding@resend.dev>"
```
Puis (re)déploie la fonction emails :
```bash
supabase functions deploy send-emails --no-verify-jwt
```

Dès lors :
- Le ST pose/modifie une date  -> email d'alerte sur TON email (ADMIN_EMAIL).
- Tu valides -> email au client (date de passage) + email au sous-traitant.

⚠ Renseigne l'email du client (fiche) et l'email du ST (Gérer les sous-traitants)
pour que les envois partent.

## 3. Déployer l'app
```bash
git add .
git commit -m "Budget ratio MO, icones multicolores, materiel, emails"
git push
```
