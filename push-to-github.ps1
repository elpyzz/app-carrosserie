# Script pour pousser le code vers GitHub
# Utilisation: .\push-to-github.ps1

Write-Host "=== Configuration Git pour app-carrosserie ===" -ForegroundColor Cyan

# Vérifier si Git est installé
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "ERREUR: Git n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host "Veuillez installer Git depuis https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Ou utilisez GitHub Desktop: https://desktop.github.com/" -ForegroundColor Yellow
    exit 1
}

# Vérifier si le dépôt est déjà initialisé
if (-not (Test-Path .git)) {
    Write-Host "Initialisation du dépôt Git..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors de l'initialisation de Git" -ForegroundColor Red
        exit 1
    }
}

# Vérifier si le remote existe
$remoteExists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ajout du remote GitHub..." -ForegroundColor Yellow
    git remote add origin https://github.com/elpyzz/app-carrosserie.git
} else {
    Write-Host "Mise à jour du remote GitHub..." -ForegroundColor Yellow
    git remote set-url origin https://github.com/elpyzz/app-carrosserie.git
}

# Ajouter tous les fichiers
Write-Host "Ajout des fichiers au staging..." -ForegroundColor Yellow
git add .

# Vérifier s'il y a des changements à commiter
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Aucun changement à commiter." -ForegroundColor Yellow
} else {
    Write-Host "Création du commit..." -ForegroundColor Yellow
    git commit -m "Initial commit: App Carrosserie avec design glassmorphism et thème sombre"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors du commit" -ForegroundColor Red
        exit 1
    }
}

# Pousser vers GitHub
Write-Host "Poussage vers GitHub..." -ForegroundColor Yellow
Write-Host "Note: Vous devrez peut-être vous authentifier." -ForegroundColor Cyan

# Essayer de pousser sur la branche main
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Succès! Le code a été poussé vers GitHub ===" -ForegroundColor Green
    Write-Host "Dépôt: https://github.com/elpyzz/app-carrosserie.git" -ForegroundColor Cyan
} else {
    Write-Host "`n=== Erreur lors du push ===" -ForegroundColor Red
    Write-Host "Causes possibles:" -ForegroundColor Yellow
    Write-Host "1. Vous n'êtes pas authentifié (utilisez: git config --global user.name 'Votre Nom')" -ForegroundColor Yellow
    Write-Host "2. Vous n'avez pas les droits sur le dépôt" -ForegroundColor Yellow
    Write-Host "3. Le dépôt distant n'est pas vide (utilisez: git push -u origin main --force)" -ForegroundColor Yellow
    Write-Host "`nPour vous authentifier, utilisez:" -ForegroundColor Cyan
    Write-Host "  git config --global user.name 'Votre Nom'" -ForegroundColor White
    Write-Host "  git config --global user.email 'votre@email.com'" -ForegroundColor White
    Write-Host "`nOu utilisez un token GitHub:" -ForegroundColor Cyan
    Write-Host "  git remote set-url origin https://VOTRE_TOKEN@github.com/elpyzz/app-carrosserie.git" -ForegroundColor White
}
