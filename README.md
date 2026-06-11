# AVISS STT — PWA de suivi des interventions sous-traitées

PWA installable (React + Vite + Supabase) pour gérer les interventions
confiées aux sous-traitants : saisie de date par le ST, validation par l'admin,
alerte automatique du client, pièces jointes/photos, suivi budgétaire.

## Stack
- React 18 + Vite, PWA (vite-plugin-pwa)
- Supabase : PostgreSQL + Auth + RLS + Storage + Edge Functions
- Emails : Resend (via Edge Function)
- Déploiement : Vercel

## Rôles
- **admin** (toi) : crée les chantiers, valide les dates, gère pièces/photos, budget.
- **sous_traitant** : voit ses chantiers, pose la date d'intervention, lecture des pièces.

## Déploiement — ordre des opérations

### 1. Supabase
Crée un projet, puis dans SQL Editor exécute dans l'ordre :
1. `01_schema.sql`     — tables, RLS, vues budget, buckets storage
2. `02_migration.sql`  — données initiales (TRX JOELI)
3. `03_complement.sql` — colonne adresse (Waze)
4. `04_notif.sql`      — drapeau vue_admin (notif nouvelles dates)

### 2. GitHub + Vercel
- Pousse ce dossier sur un repo GitHub.
- Importe le repo dans Vercel.
- Variables d'environnement Vercel :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 3. Compte admin
Authentication > Add user (ton email + mot de passe), puis :
```sql
insert into profiles (id, role, nom)
select id, 'admin', 'DJAMEL' from auth.users where email = 'TON_EMAIL';
```

### 4. Sous-traitants
Pour chaque ST : crée un user (Auth), puis :
```sql
-- profil
insert into profiles (id, role, nom)
select id, 'sous_traitant', 'JOELI' from auth.users where email = 'joeli@x.fr';
-- lier le sous-traitant à son compte + email de notification
update sous_traitants
set profile_id = (select id from auth.users where email = 'joeli@x.fr'),
    email_login = 'joeli@x.fr'
where nom = 'JOELI';
```

### 5. Emails (voir BLOC5_EMAILS.md)
Compte Resend + déploiement de l'Edge Function `send-emails` + secrets.

## Flux complet
1. Admin crée un chantier (onglet Nouveau).
2. ST se connecte, voit ses chantiers, pose une date → admin notifié par email + pastille.
3. Admin valide → client averti du passage + ST confirmé.
4. Date passée + validée → bascule automatique en Historique.
5. Admin peut joindre pièces/photos sur chaque fiche ; le ST les consulte.
