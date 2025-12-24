@echo off
echo ========================================
echo   PharmaBest - Import Medicaments PCT
echo ========================================
echo.

:menu
echo Que voulez-vous faire?
echo.
echo 1. Premier import (creer tous les medicaments)
echo 2. Mise a jour (actualiser prix et infos)
echo 3. Ouvrir le guide d'import
echo 4. Quitter
echo.
set /p choice="Votre choix (1-4): "

if "%choice%"=="1" goto import
if "%choice%"=="2" goto update
if "%choice%"=="3" goto guide
if "%choice%"=="4" goto end
goto menu

:import
echo.
echo ========================================
echo   IMPORT INITIAL
echo ========================================
echo.
echo IMPORTANT:
echo 1. Telechargez la liste PCT depuis:
echo    https://www.pct.com.tn/nomenclature
echo.
echo 2. Convertissez en CSV (UTF-8)
echo.
echo 3. Placez le fichier ici:
echo    %CD%\medicaments-cnam.csv
echo.
pause
if exist medicaments-cnam.csv (
    echo Fichier trouve! Lancement import...
    node import-cnam.js
) else (
    echo ERREUR: medicaments-cnam.csv introuvable!
    echo Placez d'abord le fichier CSV dans ce dossier.
)
echo.
pause
goto menu

:update
echo.
echo ========================================
echo   MISE A JOUR
echo ========================================
echo.
if exist medicaments-cnam.csv (
    echo Fichier trouve! Lancement mise a jour...
    node import-update.js
) else (
    echo ERREUR: medicaments-cnam.csv introuvable!
    echo Telechargez la nouvelle liste PCT d'abord.
)
echo.
pause
goto menu

:guide
echo.
echo Ouverture du guide...
start IMPORT_QUICK_GUIDE.md
goto menu

:end
echo.
echo Au revoir!
timeout /t 2 >nul
exit
