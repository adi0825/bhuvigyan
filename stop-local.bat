@echo off
REM ================================================================
REM  BHUVIGYAN — STOP ALL LOCAL SERVICES (Windows)
REM  Run: stop-local.bat
REM ================================================================

echo.
echo [93mStopping all Bhuvigyan local services...[0m
echo.

REM Kill Spring Boot (mvn spring-boot:run) processes
echo Stopping Spring Boot services...
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — *" >nul 2>&1
taskkill /F /IM "java.exe" /FI "WINDOWTITLE eq Bhuvigyan*" >nul 2>&1

REM Kill Angular (ng serve) processes
echo Stopping Angular portals...
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — Farmer*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — Admin*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — CSC*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — Inspector*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Bhuvigyan — Insurer*" >nul 2>&1

REM Kill any node processes on our ports
for %%P in (4200 4201 4202 4203 4204) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P " 2^>nul') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM Kill java processes on our backend ports
for %%P in (8081 8082 8083 8084 8086 8087 8088 8089 8091) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P " 2^>nul') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo [92mAll Bhuvigyan services stopped.[0m
echo.
echo Note: PostgreSQL and Redis are still running (system services).
echo To stop them:  net stop postgresql-x64-16   ^&   net stop Redis
echo.
pause
