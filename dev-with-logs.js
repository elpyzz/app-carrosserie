// Script de démarrage avec logs pour déboguer
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '.cursor', 'debug.log');
const logEndpoint = 'http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca';

// Fonction pour logger
function log(level, message, data = {}) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: 'dev-with-logs.js',
    message: `${level}: ${message}`,
    data: data,
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  
  // Écrire dans le fichier de log
  try {
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (e) {
    // Ignorer les erreurs d'écriture
  }
  
  // Envoyer au serveur de logs (utiliser http/https si disponible)
  try {
    const http = require('http');
    const url = new URL(logEndpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, () => {});
    req.on('error', () => {});
    req.write(JSON.stringify(logEntry));
    req.end();
  } catch (e) {
    // Ignorer les erreurs réseau
  }
}

log('INFO', 'Starting Next.js dev server', {
  nodeVersion: process.version,
  cwd: process.cwd(),
  hasNodeModules: fs.existsSync(path.join(__dirname, 'node_modules'))
});

// Vérifier si node_modules existe
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  log('ERROR', 'node_modules not found - dependencies may not be installed', {});
  console.error('❌ node_modules not found. Please run: npm install');
  process.exit(1);
}

// Démarrer le serveur Next.js
const nextDev = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

nextDev.on('error', (error) => {
  log('ERROR', 'Failed to start Next.js', {
    errorMessage: error.message,
    errorName: error.name,
    errorCode: error.code
  });
  console.error('❌ Failed to start Next.js:', error);
  process.exit(1);
});

nextDev.on('exit', (code, signal) => {
  log('INFO', 'Next.js process exited', {
    exitCode: code,
    signal: signal
  });
  
  if (code !== 0 && code !== null) {
    log('ERROR', 'Next.js exited with error code', { exitCode: code });
    console.error(`❌ Next.js exited with code ${code}`);
  }
  
  process.exit(code || 0);
});

// Log quand le serveur démarre (on écoute stdout pour détecter "Ready")
let serverReady = false;
const checkReady = setInterval(() => {
  // Next.js affiche généralement "Ready" ou "Local:" quand il est prêt
  // On ne peut pas capturer stdout facilement ici, donc on log périodiquement
  if (!serverReady) {
    log('INFO', 'Waiting for Next.js to be ready...', {});
  }
}, 5000);

// Arrêter le check après 60 secondes
setTimeout(() => {
  clearInterval(checkReady);
  if (!serverReady) {
    log('WARN', 'Server ready check timeout', {});
  }
}, 60000);
