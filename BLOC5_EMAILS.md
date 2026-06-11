# Bloc 5 — Configuration des emails (Resend + Edge Function)

## 1. Compte Resend
1. Crée un compte sur https://resend.com (gratuit : 100 emails/jour).
2. Récupère ta clé API (`re_...`) dans **API Keys**.
3. (Optionnel mais recommandé) Ajoute et vérifie ton domaine `aviss-securite.fr`
   dans **Domains** pour envoyer depuis une adresse @aviss-securite.fr.
   Sans domaine vérifié, utilise l'expéditeur de test `onboarding@resend.dev`.

## 2. Déployer l'Edge Function
La fonction est dans `supabase/functions/send-emails/index.ts`.

Avec la CLI Supabase (recommandé) :
```bash
npm install -g supabase
supabase login
supabase link --project-ref TON_PROJECT_REF
supabase functions deploy send-emails --no-verify-jwt
```

> `--no-verify-jwt` permet l'appel depuis l'app. (La fonction recharge les
> données côté serveur, le client ne fournit qu'un id, donc pas de fuite.)

## 3. Secrets de l'Edge Function
Dans **Supabase > Edge Functions > send-emails > Secrets** (ou via CLI), ajoute :

| Secret | Valeur |
|---|---|
| `RESEND_API_KEY` | ta clé `re_...` |
| `ADMIN_EMAIL` | TON email (reçoit les notifs "nouvelle date") |
| `MAIL_FROM` | `AVISS STT <onboarding@resend.dev>` (ou ton domaine vérifié) |

> `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement
> par Supabase, ne pas les ajouter à la main.

Via CLI :
```bash
supabase secrets set RESEND_API_KEY=re_xxx ADMIN_EMAIL=toi@aviss-securite.fr "MAIL_FROM=AVISS STT <onboarding@resend.dev>"
```

## 4. Renseigner les emails dans la base
Pour que les envois partent réellement :
- **email_client** : sur chaque intervention (colonne `email_client`).
- **email_login du ST** : dans la table `sous_traitants`, mets l'email de connexion
  du sous-traitant (c'est l'adresse qui recevra la confirmation).

```sql
update sous_traitants set email_login = 'joeli@exemple.fr' where nom = 'JOELI';
```

## 5. Flux automatique
- Le ST pose une date → l'app appelle la fonction (`nouvelle_date`) → **tu reçois un email**.
- Tu valides dans l'app → la fonction (`validation`) → **email client + email ST**.

Si Resend n'est pas encore configuré, l'app fonctionne quand même :
la validation passe, seuls les emails sont ignorés (message d'avertissement).
