# Sécurité MO vendue — méthode propre (table séparée)

## Principe
La MO vendue n'est PLUS une colonne de `interventions`. Elle vit dans une table
séparée `interventions_mo`, accessible UNIQUEMENT par l'admin (RLS).
Le sous-traitant ne peut PAS la lire, même via l'API. Et comme la table
`interventions` n'est jamais touchée, AUCUN risque de blocage (403).

## 1. SQL (Supabase SQL Editor)
Exécute **08_mo_securisee.sql**. Il :
- répare l'accès à interventions (au cas où le fichier 05 aurait laissé des restes),
- retire mo_vendue de interventions,
- crée la table protégée interventions_mo (admin-only),
- recrée la vue v_budget_admin (jointure pour le ratio).

## 2. Déployer l'app (Git Bash)
```bash
git add .
git commit -m "MO vendue securisee : table separee admin-only"
git push
```
(Pas de redeploy de fonction nécessaire.)

## Vérifier
- En admin : créer/éditer un chantier avec une MO vendue -> Budget affiche le ratio.
- En sous-traitant : aucune trace de la MO nulle part (ni écran, ni données).
