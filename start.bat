@echo off
title IJAZ Call - Launcher
color 0A

echo.
echo  ============================================
echo   IJAZ CALL - Starting App...
echo  ============================================
echo.

echo  [1/2] Starting Signaling Server (port 5000)...
start "IJAZ Call - Server" cmd /k "cd /d "%~dp0server" && echo Starting server... && node server.js"

timeout /t 2 /nobreak >nul

echo  [2/2] Starting Frontend (port 5173)...
start "IJAZ Call - Client" cmd /k "cd /d "%~dp0client" && echo Starting client... && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  ============================================
echo   Both services are starting!
echo   
echo   Server  -->  http://localhost:5000
echo   Client  -->  http://localhost:5173
echo  ============================================
echo.
echo  Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo  You can close this window. 
echo  Close the two opened terminal windows to stop the app.
echo.
pause
