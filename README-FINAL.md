# RR Location — version finale fusionnée

Cette version combine :
- le site public de `rrlocation-site-updated` ;
- les pages Mentions légales, CGV et Politique de confidentialité ;
- le calendrier public connecté en temps réel à Firebase Firestore ;
- `admin.html` avec connexion administrateur ;
- le système de blocage/déblocage des dates via Firestore.

## Gestion des disponibilités

Il n'y a plus besoin de modifier `data/disponibilites.json`.

### Côté administrateur
1. Ouvrir `https://rrlocation.fr/admin.html` après déploiement.
2. Se connecter avec le compte Firebase administrateur.
3. Aller dans **Disponibilités**.
4. Cliquer sur les jours pour les bloquer/débloquer, ou utiliser **Bloquer une période**.
5. Les changements sont enregistrés dans Firestore et apparaissent automatiquement sur le calendrier client.

## Configuration Firebase à faire une seule fois

Le projet Firebase utilisé est `rr-location-a7b67`.

Dans Firebase :
1. **Firestore Database** : créer/activer la base.
2. Dans **Règles**, publier le contenu de `js/firestore.rules.txt`.
3. **Authentication → Sign-in method** : activer **E-mail/Mot de passe**.
4. **Authentication → Users** : créer le compte administrateur qui servira à `admin.html`.

Les règles permettent la lecture publique des disponibilités et l'écriture uniquement aux utilisateurs authentifiés.

## Important

Le fichier `js/firebase-config.js` est déjà renseigné pour le projet RR Location.

Le fichier `data/disponibilites.json` a été retiré de la version finale pour éviter deux sources de vérité.

## Déploiement

Le projet est prévu pour être envoyé sur GitHub/Vercel. Une fois poussé sur `main`, Vercel peut déployer automatiquement.

## Fonctionnement

Client :
`index.html` → `js/main.js` → Firestore

Administrateur :
`admin.html` → Firebase Authentication → `js/availability.js` → Firestore

Document Firestore utilisé :
`rrlocation / disponibilites`

Champ :
`blockedDates` : tableau de dates au format `YYYY-MM-DD`.
