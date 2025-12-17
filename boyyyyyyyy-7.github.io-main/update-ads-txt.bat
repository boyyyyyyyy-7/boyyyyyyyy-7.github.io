@echo off
REM Ezoic Ads.txt Manager Update Script for Windows
REM This script fetches the latest ads.txt content from Ezoic and updates your local file

REM Configuration
set ACCOUNT_ID=19390
set DOMAIN=braydenistallgames.online
set ADS_TXT_URL=https://srv.adstxtmanager.com/%ACCOUNT_ID%/%DOMAIN%
set LOCAL_ADS_TXT=ads.txt

echo Updating ads.txt from Ezoic Ads.txt Manager...
echo URL: %ADS_TXT_URL%

REM Fetch the ads.txt content from Ezoic
curl -s "%ADS_TXT_URL%" > "%LOCAL_ADS_TXT%"

REM Check if the curl command was successful
if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully updated ads.txt
    echo 📅 Updated at: %DATE% %TIME%
) else (
    echo ❌ Failed to update ads.txt
    pause
    exit /b 1
)

pause
