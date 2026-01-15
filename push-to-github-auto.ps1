# Script automatique pour trouver Git et pousser vers GitHub
# Ce script essaie plusieurs emplacements communs pour Git sur Windows

Write-Host "=== Recherche de Git et push vers GitHub ===" -ForegroundColor Cyan

# Chemins communs pour Git sur Windows
$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\cmd\git.exe",
    "$env:ProgramFiles(x86)\Git\cmd\git.exe"
)

$gitExe = $null

# Chercher Git dans les chemins communs
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitExe = $path
        Write-Host "Git trouvé à: $path" -ForegroundColor Green
        break
    }
}

# Si pas trouvé, essayer via PATH
if (-not $gitExe) {
    try {
        $gitExe = Get-Command git -ErrorAction Stop | Select-Object -ExpandProperty Source
        Write-Host "Git trouvé dans PATH: $gitExe" -ForegroundColor Green
    } catch {
        Write-Host "Git n'a pas été trouvé." -ForegroundColor Red
        Write-Host "`n=== INSTALLATION REQUISE ===" -ForegroundColor Yellow
        Write-Host "Veuillez installer Git depuis l'une de ces sources:" -ForegroundColor Yellow
        Write-Host "1. Site officiel: https://git-scm.com/download/win" -ForegroundColor Cyan
        Write-Host "2. GitHub Desktop: https://desktop.github.com/ (inclut Git)" -ForegroundColor Cyan
        Write-Host "3. Winget: winget install Git.Git" -ForegroundColor Cyan
        Write-Host "4. Chocolatey: choco install git" -ForegroundColor Cyan
        Write-Host "`nAprès l'installation, relancez ce script." -ForegroundColor Yellow
        exit 1
    }
}

# Fonction pour exécuter Git
function Invoke-Git {
    param([string[]]$Arguments)
    & $gitExe $Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur Git (code $LASTEXITCODE)" -ForegroundColor Red
        return $false
    }
    return $true
}

Write-Host "`n=== Configuration du dépôt ===" -ForegroundColor Cyan

# Vérifier si Git est déjà initialisé
if (-not (Test-Path .git)) {
    Write-Host "Initialisation du dépôt Git..." -ForegroundColor Yellow
    if (-not (Invoke-Git @("init"))) { exit 1 }
} else {
    Write-Host "Dépôt Git déjà initialisé." -ForegroundColor Green
}

# Vérifier la configuration Git
$userName = Invoke-Git @("config", "--global", "user.name") 2>$null
$userEmail = Invoke-Git @("config", "--global", "user.email") 2>$null

if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
    Write-Host "`n=== Configuration Git requise ===" -ForegroundColor Yellow
    Write-Host "Git n'est pas configuré. Veuillez entrer vos informations:" -ForegroundColor Yellow
    $name = Read-Host "Votre nom"
    $email = Read-Host "Votre email"
    
    Invoke-Git @("config", "--global", "user.name", $name) | Out-Null
    Invoke-Git @("config", "--global", "user.email", $email) | Out-Null
    Write-Host "Configuration Git enregistrée." -ForegroundColor Green
}

# Vérifier le remote
$remoteUrl = Invoke-Git @("remote", "get-url", "origin") 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ajout du remote GitHub..." -ForegroundColor Yellow
    if (-not (Invoke-Git @("remote", "add", "origin", "https://github.com/elpyzz/app-carrosserie.git"))) { exit 1 }
} else {
    Write-Host "Mise à jour du remote GitHub..." -ForegroundColor Yellow
    if (-not (Invoke-Git @("remote", "set-url", "origin", "https://github.com/elpyzz/app-carrosserie.git"))) { exit 1 }
}

# Ajouter tous les fichiers
Write-Host "`n=== Ajout des fichiers ===" -ForegroundColor Cyan
if (-not (Invoke-Git @("add", "."))) { exit 1 }
Write-Host "Fichiers ajoutés." -ForegroundColor Green

# Vérifier s'il y a des changements
$status = Invoke-Git @("status", "--porcelain")
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Aucun changement à commiter." -ForegroundColor Yellow
    Write-Host "Vérification de l'état du dépôt distant..." -ForegroundColor Yellow
} else {
    Write-Host "`n=== Création du commit ===" -ForegroundColor Cyan
    $commitMessage = "Initial commit: App Carrosserie avec design glassmorphism et thème sombre éclairci"
    if (-not (Invoke-Git @("commit", "-m", $commitMessage))) { exit 1 }
    Write-Host "Commit créé avec succès." -ForegroundColor Green
}

# Renommer la branche en main
Write-Host "`n=== Configuration de la branche ===" -ForegroundColor Cyan
Invoke-Git @("branch", "-M", "main") | Out-Null

# Pousser vers GitHub
Write-Host "`n=== Poussage vers GitHub ===" -ForegroundColor Cyan
Write-Host "Note: Vous devrez peut-être vous authentifier." -ForegroundColor Yellow
Write-Host "Si demandé, utilisez votre nom d'utilisateur GitHub et un Personal Access Token comme mot de passe." -ForegroundColor Yellow
Write-Host "Pour créer un token: https://github.com/settings/tokens" -ForegroundColor Cyan

if (Invoke-Git @("push", "-u", "origin", "main")) {
    Write-Host "`n=== SUCCÈS! ===" -ForegroundColor Green
    Write-Host "Le code a été poussé vers GitHub avec succès!" -ForegroundColor Green
    Write-Host "Dépôt: https://github.com/elpyzz/app-carrosserie.git" -ForegroundColor Cyan
} else {
    Write-Host "`n=== Erreur lors du push ===" -ForegroundColor Red
    Write-Host "Causes possibles:" -ForegroundColor Yellow
    Write-Host "1. Authentification requise (utilisez un Personal Access Token)" -ForegroundColor Yellow
    Write-Host "2. Le dépôt distant n'est pas vide (essayez: git push -u origin main --force)" -ForegroundColor Yellow
    Write-Host "3. Vous n'avez pas les droits sur le dépôt" -ForegroundColor Yellow
    Write-Host "`nPour créer un Personal Access Token:" -ForegroundColor Cyan
    Write-Host "1. Allez sur: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "2. Cliquez sur 'Generate new token (classic)'" -ForegroundColor White
    Write-Host "3. Donnez un nom et sélectionnez la permission 'repo'" -ForegroundColor White
    Write-Host "4. Copiez le token et utilisez-le comme mot de passe lors du push" -ForegroundColor White
}
