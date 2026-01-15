# Instructions pour pousser le code vers GitHub

## Dépôt GitHub
**URL** : https://github.com/elpyzz/app-carrosserie.git

## Méthode 1 : Git en ligne de commande (Recommandé)

### Étape 1 : Installer Git

Si Git n'est pas installé sur votre machine :

1. **Télécharger Git pour Windows** :
   - Aller sur : https://git-scm.com/download/win
   - Télécharger et installer l'exécutable
   - Pendant l'installation, choisir "Git from the command line and also from 3rd-party software"

2. **Vérifier l'installation** :
   ```bash
   git --version
   ```

### Étape 2 : Configurer Git (première fois seulement)

Ouvrir PowerShell ou CMD et exécuter :

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
```

### Étape 3 : Initialiser le dépôt

Dans le dossier du projet, exécuter :

```bash
# Initialiser Git
git init

# Ajouter le remote GitHub
git remote add origin https://github.com/elpyzz/app-carrosserie.git

# Vérifier que le remote est bien configuré
git remote -v
```

### Étape 4 : Ajouter et commiter les fichiers

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Créer un commit
git commit -m "Initial commit: App Carrosserie avec design glassmorphism et thème sombre"
```

### Étape 5 : Pousser vers GitHub

```bash
# Renommer la branche en main
git branch -M main

# Pousser vers GitHub
git push -u origin main
```

**Si vous devez vous authentifier** :
- GitHub peut demander vos identifiants
- Ou utilisez un Personal Access Token :
  1. Aller sur GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
  2. Générer un nouveau token avec les permissions `repo`
  3. Utiliser le token comme mot de passe lors du push

**Si le dépôt distant n'est pas vide** :
```bash
git push -u origin main --force
```

⚠️ **Attention** : `--force` écrase l'historique distant. Utilisez avec précaution.

---

## Méthode 2 : GitHub Desktop (Plus simple)

### Étape 1 : Installer GitHub Desktop

1. Télécharger depuis : https://desktop.github.com/
2. Installer et lancer l'application
3. Se connecter avec votre compte GitHub

### Étape 2 : Ajouter le dépôt local

1. Dans GitHub Desktop, cliquer sur **File** > **Add Local Repository**
2. Cliquer sur **Choose...** et sélectionner le dossier du projet (`C:\Users\nezwi\App Carrosserie`)
3. Cliquer sur **Add repository**

### Étape 3 : Publier le dépôt

1. Dans GitHub Desktop, vous verrez tous les fichiers modifiés
2. En bas à gauche, écrire un message de commit : `Initial commit: App Carrosserie avec design glassmorphism`
3. Cliquer sur **Commit to main**
4. Cliquer sur **Publish repository** en haut
5. Vérifier que le nom du dépôt est `app-carrosserie`
6. Vérifier que le propriétaire est `elpyzz`
7. Cliquer sur **Publish repository**

---

## Méthode 3 : Script PowerShell automatique

Un script `push-to-github.ps1` a été créé pour automatiser le processus.

### Exécuter le script

```powershell
powershell -ExecutionPolicy Bypass -File "push-to-github.ps1"
```

Le script va :
1. Vérifier si Git est installé
2. Initialiser le dépôt si nécessaire
3. Ajouter le remote GitHub
4. Ajouter tous les fichiers
5. Créer un commit
6. Pousser vers GitHub

**Note** : Vous devrez peut-être vous authentifier lors du push.

---

## Vérification

Après avoir poussé le code, vérifier sur GitHub :
- Aller sur : https://github.com/elpyzz/app-carrosserie
- Vous devriez voir tous vos fichiers

---

## Problèmes courants

### Erreur : "Git n'est pas reconnu"
→ Git n'est pas installé ou n'est pas dans le PATH. Installer Git depuis https://git-scm.com/download/win

### Erreur : "Permission denied"
→ Vous n'avez pas les droits sur le dépôt. Vérifier que vous êtes bien connecté avec le compte `elpyzz`

### Erreur : "Repository not found"
→ Le dépôt n'existe pas encore sur GitHub. Le créer d'abord sur https://github.com/new

### Erreur : "Authentication failed"
→ Utiliser un Personal Access Token au lieu du mot de passe :
  1. GitHub > Settings > Developer settings > Personal access tokens
  2. Générer un token avec permission `repo`
  3. Utiliser le token comme mot de passe

---

## Commandes Git utiles

```bash
# Voir l'état du dépôt
git status

# Voir l'historique des commits
git log

# Voir les remotes configurés
git remote -v

# Changer l'URL du remote
git remote set-url origin https://github.com/elpyzz/app-carrosserie.git

# Annuler le dernier commit (garder les fichiers)
git reset --soft HEAD~1

# Voir les différences
git diff
```
