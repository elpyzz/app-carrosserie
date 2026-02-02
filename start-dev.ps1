# Script pour démarrer le serveur et capturer les erreurs
$ErrorActionPreference = "Continue"

Write-Host "=== Démarrage du serveur Next.js ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Arrêter les processus Node.js existants
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Arrêt des processus Node.js existants..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Vérifier les dépendances
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules introuvable. Exécutez: npm install" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dépendances trouvées" -ForegroundColor Green
Write-Host ""

# Lancer le serveur et capturer la sortie
Write-Host "Lancement de 'npm run dev'..." -ForegroundColor Cyan
Write-Host ""

$process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -RedirectStandardOutput "dev-output.log" -RedirectStandardError "dev-error.log"

Write-Host "Processus démarré (PID: $($process.Id))" -ForegroundColor Green
Write-Host "Attente de 10 secondes pour voir les messages de démarrage..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier si le processus est toujours en cours
if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Le processus s'est arrêté!" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== ERREURS ===" -ForegroundColor Red
    if (Test-Path "dev-error.log") {
        Get-Content "dev-error.log" | Write-Host
    }
    if (Test-Path "dev-output.log") {
        Get-Content "dev-output.log" | Write-Host
    }
} else {
    Write-Host "✅ Le processus est toujours en cours" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== SORTIE ===" -ForegroundColor Cyan
    if (Test-Path "dev-output.log") {
        Get-Content "dev-output.log" -Tail 30 | Write-Host
    }
    if (Test-Path "dev-error.log") {
        $errors = Get-Content "dev-error.log"
        if ($errors) {
            Write-Host ""
            Write-Host "=== ERREURS ===" -ForegroundColor Red
            $errors | Write-Host
        }
    }
    
    # Vérifier les ports
    Write-Host ""
    Write-Host "=== PORTS EN ÉCOUTE ===" -ForegroundColor Cyan
    $ports = netstat -ano | Select-String ":3000|:3001"
    if ($ports) {
        $ports | Write-Host
    } else {
        Write-Host "Aucun port 3000 ou 3001 en écoute" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Pour voir les logs en temps réel, ouvrez dev-output.log et dev-error.log" -ForegroundColor Gray
