@echo off
title RegMaster v3 Emulator Bootstrap
echo.
echo ===============================================
echo  RegMaster v3 Emulator Bootstrap
echo ===============================================
echo.
echo [1/3] Stopping zombie node.exe processes (frees ports 4000/5000/8085/5001)
taskkill /F /IM node.exe /T >nul 2>&1
echo       done.
echo.
echo [2/3] Waiting 3 seconds for sockets to release
timeout /T 3 /NOBREAK >nul
echo       done.
echo.
echo [3/3] Starting Firebase emulator
echo       (this window MUST stay open during verification)
echo       Look for the line: "All emulators ready"
echo.
cd /d C:\Users\rockj\RegMaster
call firebase emulators:start --only hosting,functions,firestore --project=regmaster-pro
echo.
echo ===============================================
echo  Emulator exited. Press any key to close.
echo ===============================================
pause >nul
