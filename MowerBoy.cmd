@echo off
cd /d "%~dp0"
node scripts\gateway.mjs
if errorlevel 1 pause
