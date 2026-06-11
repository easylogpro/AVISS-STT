# Création des accès sous-traitants depuis l'app

## Déployer l'Edge Function (une seule fois)

```bash
supabase functions deploy creer-st --no-verify-jwt
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_ANON_KEY` sont
> injectés automatiquement par Supabase. Rien à configurer en plus.

## Utilisation

1. Dans l'app admin : badge **ADMIN ⚙** (en haut) → **Gérer les sous-traitants**.
2. Crée un sous-traitant (nom) s'il n'existe pas encore.
3. Sur sa fiche, bouton **« Créer l'accès »** → saisis son **email** et un **mot de passe** → Valider.
4. L'app crée le compte, le profil et la liaison automatiquement.
5. Communique l'email + mot de passe au sous-traitant. Il se connecte → il voit ses chantiers.

Plus besoin de passer par Supabase Authentication ni le SQL Editor.

## Sécurité
- La fonction vérifie que l'appelant est **admin** avant toute création.
- En cas d'erreur en cours de route, le compte créé est annulé (rollback).
