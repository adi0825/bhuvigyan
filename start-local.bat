@echo off
REM ================================================================
REM  BHUVIGYAN — LOCAL START SCRIPT (Windows)
REM ================================================================

setlocal EnableDelayedExpansion

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   BHUVIGYAN — LOCAL DEV STARTUP (Windows)           ║
echo  ║   Full Stack Infrastructure                         ║
echo  ╚══════════════════════════════════════════════════════╝

REM ── STEP 1: CHECK PREREQUISITES ────────────────────────────────
echo [1/6] Checking prerequisites...

set "MVN_PATH=%~dp0apache-maven-3.9.15\bin\mvn.cmd"
if not exist "%MVN_PATH%" (
    echo   ! Maven not found at %MVN_PATH%. Using system mvn...
    set "MVN_PATH=mvn"
)

java -version >nul 2>&1
if errorlevel 1 (
    echo   X Java 21 not found.
    pause & exit /b 1
)
echo   + Java found

psql --version >nul 2>&1
if errorlevel 1 (
    echo   ! psql not found in PATH. Ensure database is running manually.
) else (
    echo   + psql found
)

node --version >nul 2>&1
if errorlevel 1 (
    echo   ! Node.js not found in PATH. Frontend may fail to start.
) else (
    echo   + Node.js found
)

REM ── STEP 2: START POSTGRESQL ───────────────────────────────────
echo.
echo [2/6] Starting PostgreSQL...
set "PG_STARTED=N"
net start postgresql-x64-18 >nul 2>&1 && set "PG_STARTED=Y"
if "!PG_STARTED!"=="N" net start postgresql-x64-16 >nul 2>&1 && set "PG_STARTED=Y"
if "!PG_STARTED!"=="N" net start postgresql-x64-15 >nul 2>&1 && set "PG_STARTED=Y"

if "!PG_STARTED!"=="Y" (
    echo   + PostgreSQL started
) else (
    echo   ! Could not start PostgreSQL service (may already be running)
)

REM ── STEP 3: START REDIS ────────────────────────────────────────
echo.
echo [3/6] Starting Redis...
net start Redis >nul 2>&1
if errorlevel 1 (
    start /B redis-server >nul 2>&1
    echo   + Redis started (background)
) else (
    echo   + Redis started (service)
)

REM ── STEP 4: BUILD COMMON MODULE ────────────────────────────────
echo.
echo [4/6] Building common module...
cd backend
call "%MVN_PATH%" -pl common -am install -DskipTests -q
if errorlevel 1 (
    echo   X Common module build FAILED.
    cd ..
    pause & exit /b 1
)
echo   + Common module built
cd ..

REM ── STEP 5: START SPRING BOOT SERVICES ────────────────────────
echo.
echo [5/6] Starting Spring Boot services...

REM Start Gateway (8080)
echo   Starting gateway (port 8080)...
start "Bhuvigyan — gateway" cmd /k "title Bhuvigyan Gateway && cd /d %~dp0backend\gateway && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"
ping -n 6 127.0.0.1 >nul

REM Start Core Services
echo   Starting location-service (8084)...
start "Bhuvigyan — location-service" cmd /k "title Bhuvigyan location-service && cd /d %~dp0backend\location-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting farmer-service (8081)...
start "Bhuvigyan — farmer-service" cmd /k "title Bhuvigyan farmer-service && cd /d %~dp0backend\farmer-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting admin-service (8082)...
start "Bhuvigyan — admin-service" cmd /k "title Bhuvigyan admin-service && cd /d %~dp0backend\admin-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting claims-service (8083)...
start "Bhuvigyan — claims-service" cmd /k "title Bhuvigyan claims-service && cd /d %~dp0backend\claims-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting notification-service (8087)...
start "Bhuvigyan — notification-service" cmd /k "title Bhuvigyan notification-service && cd /d %~dp0backend\notification-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting kyc-service (8086)...
start "Bhuvigyan — kyc-service" cmd /k "title Bhuvigyan kyc-service && cd /d %~dp0backend\kyc-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting report-service (8089)...
start "Bhuvigyan — report-service" cmd /k "title Bhuvigyan report-service && cd /d %~dp0backend\report-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting insurer-service (8092)...
start "Bhuvigyan — insurer-service" cmd /k "title Bhuvigyan insurer-service && cd /d %~dp0backend\insurer-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting csc-service (8094)...
start "Bhuvigyan — csc-service" cmd /k "title Bhuvigyan csc-service && cd /d %~dp0backend\csc-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting officer-service (8095)...
start "Bhuvigyan — officer-service" cmd /k "title Bhuvigyan officer-service && cd /d %~dp0backend\officer-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   Starting state-service (8096)...
start "Bhuvigyan — state-service" cmd /k "title Bhuvigyan state-service && cd /d %~dp0backend\state-service && set SPRING_PROFILES_ACTIVE=local && call \"%MVN_PATH%\" spring-boot:run"

echo   + All backend services launching...

REM ── STEP 6: START REACT FRONTEND ─────────────────────────────
echo.
echo [6/6] Starting React Frontend...
cd frontend\bhuvigyan-ui
if exist "node_modules" goto START_FRONTEND
echo   Installing dependencies (this may take a minute)...
call npm install --silent

:START_FRONTEND
start "Bhuvigyan — React Web" cmd /k "title Bhuvigyan React Web && npm run dev"
cd /d %~dp0

REM ── SUMMARY ────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   BHUVIGYAN — ALL SERVICES LAUNCHING                    ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  React Portal    →  http://localhost:3000                ║
echo  ║  Gateway API     →  http://localhost:8080                ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Dev OTP: 123456  ^|  Admin Pass: Admin@123              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
