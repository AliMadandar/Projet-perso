@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 24 puis relancez ce fichier.
  pause
  exit /b 1
)
echo Ouvrez http://localhost:3000 dans le navigateur.
node --env-file-if-exists=.env src/server.js
pause
