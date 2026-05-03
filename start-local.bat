@echo off
REM ================================================================
REM  BHUVIGYAN — LOCAL START SCRIPT (Windows, No Docker)
REM  Run: start-local.bat
REM  Requires: Java 21, Maven, Node 20, PostgreSQL 16, Redis
REM ================================================================

setlocal EnableDelayedExpansion

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo.
echo %CYAN%
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   BHUVIGYAN — LOCAL DEV STARTUP (Windows)           ║
echo  ║   No Docker required                                 ║
echo  ╚══════════════════════════════════════════════════════╝
echo %RESET%

REM ── STEP 1: CHECK PREREQUISITES ────────────────────────────────
echo %YELLOW%[1/6] Checking prerequisites...%RESET%

java -version >nul 2>&1
if errorlevel 1 (
    echo %RED%  ✗ Java 21 not found. Install: winget install Microsoft.OpenJDK.21%RESET%
    pause & exit /b 1
)
echo %GREEN%  ✓ Java found%RESET%

mvn -version >nul 2>&1
if errorlevel 1 (
    echo %RED%  ✗ Maven not found. Install: winget install Apache.Maven%RESET%
    pause & exit /b 1
)
echo %GREEN%  ✓ Maven found%RESET%

psql --version >nul 2>&1
if errorlevel 1 (
    echo %RED%  ✗ PostgreSQL not found. Install: winget install PostgreSQL.PostgreSQL%RESET%
    pause & exit /b 1
)
echo %GREEN%  ✓ PostgreSQL found%RESET%

node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%  ✗ Node.js not found. Install: winget install OpenJS.NodeJS.LTS%RESET%
    pause & exit /b 1
)
echo %GREEN%  ✓ Node.js found%RESET%

REM ── STEP 2: START POSTGRESQL ───────────────────────────────────
echo.
echo %YELLOW%[2/6] Starting PostgreSQL...%RESET%
net start postgresql-x64-16 >nul 2>&1
if errorlevel 1 (
    net start postgresql-x64-15 >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%  ⚠ Could not start PostgreSQL service (may already be running)%RESET%
    )
)

REM Wait for postgres to be ready
timeout /t 3 /nobreak >nul

REM Create DB and user if not exists
echo   Setting up bhuvigyan database...
psql -U postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bhuvigyan') THEN CREATE USER bhuvigyan WITH PASSWORD 'bhuvigyan123'; END IF; END $$;" >nul 2>&1
psql -U postgres -c "CREATE DATABASE bhuvigyan OWNER bhuvigyan;" >nul 2>&1
psql -U bhuvigyan -d bhuvigyan -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" >nul 2>&1
echo %GREEN%  ✓ PostgreSQL ready (bhuvigyan DB)%RESET%

REM ── STEP 3: START REDIS ────────────────────────────────────────
echo.
echo %YELLOW%[3/6] Starting Redis...%RESET%
net start Redis >nul 2>&1
if errorlevel 1 (
    REM Try Redis as a background process if not installed as service
    where redis-server >nul 2>&1
    if not errorlevel 1 (
        start /B redis-server
        timeout /t 2 /nobreak >nul
        echo %GREEN%  ✓ Redis started (background process)%RESET%
    ) else (
        echo %YELLOW%  ⚠ Redis not found as service. Install: winget install Redis.Redis%RESET%
        echo %YELLOW%    Services will use local cache fallback.%RESET%
    )
) else (
    echo %GREEN%  ✓ Redis started%RESET%
)

REM ── STEP 4: BUILD COMMON MODULE ────────────────────────────────
echo.
echo %YELLOW%[4/6] Building common module (first time may take 2-3 min)...%RESET%
cd backend
call mvn -pl common -am install -DskipTests -q
if errorlevel 1 (
    echo %RED%  ✗ Common module build FAILED. Check errors above.%RESET%
    cd ..
    pause & exit /b 1
)
echo %GREEN%  ✓ Common module built%RESET%
cd ..

REM ── STEP 5: START SPRING BOOT SERVICES ────────────────────────
echo.
echo %YELLOW%[5/6] Starting Spring Boot services...%RESET%
echo   (Each opens in its own window — do NOT close them)
echo.

REM Location Service (8084) — start first as others depend on it
echo   Starting location-service (port 8084)...
start "Bhuvigyan — location-service (8084)" cmd /k "title Bhuvigyan location-service && cd /d %~dp0backend\location-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8084 && mvn spring-boot:run"
timeout /t 8 /nobreak >nul

REM Farmer Service (8081)
echo   Starting farmer-service (port 8081)...
start "Bhuvigyan — farmer-service (8081)" cmd /k "title Bhuvigyan farmer-service && cd /d %~dp0backend\farmer-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8081 && mvn spring-boot:run"
timeout /t 5 /nobreak >nul

REM Admin Service (8082)
echo   Starting admin-service (port 8082)...
start "Bhuvigyan — admin-service (8082)" cmd /k "title Bhuvigyan admin-service && cd /d %~dp0backend\admin-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8082 && mvn spring-boot:run"
timeout /t 5 /nobreak >nul

REM Claims Service (8083)
echo   Starting claims-service (port 8083)...
start "Bhuvigyan — claims-service (8083)" cmd /k "title Bhuvigyan claims-service && cd /d %~dp0backend\claims-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8083 && mvn spring-boot:run"
timeout /t 5 /nobreak >nul

REM Notification Service (8087)
echo   Starting notification-service (port 8087)...
start "Bhuvigyan — notification-service (8087)" cmd /k "title Bhuvigyan notification-service && cd /d %~dp0backend\notification-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8087 && mvn spring-boot:run"
timeout /t 5 /nobreak >nul

REM KYC Service (8086)
echo   Starting kyc-service (port 8086)...
start "Bhuvigyan — kyc-service (8086)" cmd /k "title Bhuvigyan kyc-service && cd /d %~dp0backend\kyc-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8086 && mvn spring-boot:run"
timeout /t 5 /nobreak >nul

REM Report Service (8089)
echo   Starting report-service (port 8089)...
start "Bhuvigyan — report-service (8089)" cmd /k "title Bhuvigyan report-service && cd /d %~dp0backend\report-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8089 && mvn spring-boot:run"
timeout /t 3 /nobreak >nul

REM CCE Service (8088)
echo   Starting cce-service (port 8088)...
start "Bhuvigyan — cce-service (8088)" cmd /k "title Bhuvigyan cce-service && cd /d %~dp0backend\cce-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8088 && mvn spring-boot:run"
timeout /t 3 /nobreak >nul

echo %GREEN%  ✓ All backend services launching...%RESET%

REM ── STEP 6: START ANGULAR FRONTENDS ───────────────────────────
echo.
echo %YELLOW%[6/6] Starting Angular portals...%RESET%
echo   (Each opens in its own window)
echo.

cd frontend

REM Install deps if needed (only once)
if not exist "farmer\node_modules" (
    echo   Installing farmer portal dependencies...
    cd farmer && call npm install --silent && cd ..
)
if not exist "admin\node_modules" (
    echo   Installing admin portal dependencies...
    cd admin && call npm install --silent && cd ..
)
if not exist "csc\node_modules" (
    echo   Installing csc portal dependencies...
    cd csc && call npm install --silent && cd ..
)

REM Start Angular apps
echo   Starting farmer portal (port 4200)...
start "Bhuvigyan — Farmer Portal (4200)" cmd /k "title Bhuvigyan Farmer Portal && cd /d %~dp0frontend\farmer && npx ng serve --port 4200 --proxy-config proxy.conf.local.json --disable-host-check"

echo   Starting admin portal (port 4201)...
start "Bhuvigyan — Admin Portal (4201)" cmd /k "title Bhuvigyan Admin Portal && cd /d %~dp0frontend\admin && npx ng serve --port 4201 --proxy-config proxy.conf.local.json --disable-host-check"

echo   Starting CSC portal (port 4202)...
start "Bhuvigyan — CSC Portal (4202)" cmd /k "title Bhuvigyan CSC Portal && cd /d %~dp0frontend\csc && npx ng serve --port 4202 --disable-host-check"

echo   Starting Inspector portal (port 4203)...
start "Bhuvigyan — Inspector Portal (4203)" cmd /k "title Bhuvigyan Inspector Portal && cd /d %~dp0frontend\inspector && npx ng serve --port 4203 --disable-host-check"

echo   Starting Insurer portal (port 4204)...
start "Bhuvigyan — Insurer Portal (4204)" cmd /k "title Bhuvigyan Insurer Portal && cd /d %~dp0frontend\insurer && npx ng serve --port 4204 --disable-host-check"

cd ..

REM ── SUMMARY ────────────────────────────────────────────────────
echo.
echo %CYAN%
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   BHUVIGYAN — ALL SERVICES LAUNCHING                    ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Services take 30-60 seconds to fully start up          ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Farmer Portal   →  http://localhost:4200                ║
echo  ║  Admin Portal    →  http://localhost:4201                ║
echo  ║  CSC Portal      →  http://localhost:4202                ║
echo  ║  Inspector       →  http://localhost:4203                ║
echo  ║  Insurer         →  http://localhost:4204                ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Location API    →  http://localhost:8084/actuator/health║
echo  ║  Farmer API      →  http://localhost:8081/actuator/health║
echo  ║  Claims API      →  http://localhost:8083/actuator/health║
echo  ║  Admin API       →  http://localhost:8082/actuator/health║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Dev OTP: 123456  ^|  Admin pass: Admin@123              ║
echo  ║  CSC pass: Csc@1234  ^|  Kafka: DISABLED (local mode)   ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  To stop everything: run stop-local.bat                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo %RESET%
echo.
echo NOTE: Wait ~60 seconds for all services to boot before opening portals.
echo.
pause
