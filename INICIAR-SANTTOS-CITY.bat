@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Instale Node.js 20 ou superior: https://nodejs.org/
  pause
  exit /b 1
)
node -e "const n=require('net').createServer();n.once('error',()=>process.exit(2));n.listen(4317,'127.0.0.1',()=>n.close(()=>process.exit(0)));"
if errorlevel 1 (
  echo.
  echo [ATENCAO] A porta 4317 ja esta sendo usada.
  echo Feche o CMD ou servidor das versoes antigas da SanTTos Agent City.
  echo Depois execute este iniciador novamente para abrir a v0.4.
  echo.
  pause
  exit /b 2
)
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process http://127.0.0.1:4317"
node server.js
pause
