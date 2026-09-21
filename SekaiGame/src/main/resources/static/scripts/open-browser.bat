@echo off
timeout /t 2 /nobreak >nul
set "GAME_PORT=%~1"
if not defined GAME_PORT set "GAME_PORT=8091"
start "" "http://127.0.0.1:%GAME_PORT%/?build=1.9.2-mobile"
