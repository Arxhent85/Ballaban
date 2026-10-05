@echo off
chcp 65001 >nul
title Ferienhaus CAD-Planer
echo ========================================================
echo   Ferienhaus Grundriss- & Bauplan-Planer CAD
echo ========================================================
echo.
echo Starte das Programm in Ihrem Standardbrowser...
echo.

set "HTML_FILE=%~dp0HausPlaner.html"
if not exist "%HTML_FILE%" set "HTML_FILE=%~dp0dist\index.html"

if exist "%HTML_FILE%" (
    start "" "%HTML_FILE%"
    echo Programm wurde erfolgreich geöffnet!
    echo Sie können dieses Konsolenfenster nun schließen.
) else (
    echo [FEHLER] HausPlaner.html konnte nicht gefunden werden.
    pause
)
