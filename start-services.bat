@echo off
set PATH=C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin;%PATH%

echo Starting Farmer Service...
start "Farmer Service" cmd /k "cd /d c:\Users\athar\Desktop\Agri\backend\farmer-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8081 && mvn spring-boot:run"

timeout /t 5 /nobreak >nul

echo Starting Admin Service...
start "Admin Service" cmd /k "cd /d c:\Users\athar\Desktop\Agri\backend\admin-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8082 && mvn spring-boot:run"

timeout /t 5 /nobreak >nul

echo Starting Claims Service...
start "Claims Service" cmd /k "cd /d c:\Users\athar\Desktop\Agri\backend\claims-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8083 && mvn spring-boot:run"

timeout /t 5 /nobreak >nul

echo Starting Location Service...
start "Location Service" cmd /k "cd /d c:\Users\athar\Desktop\Agri\backend\location-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8084 && mvn spring-boot:run"

timeout /t 5 /nobreak >nul

echo Starting Insurer Service...
start "Insurer Service" cmd /k "cd /d c:\Users\athar\Desktop\Agri\backend\insurer-service && set SPRING_PROFILES_ACTIVE=local && set SERVER_PORT=8092 && mvn spring-boot:run"

echo All services starting...
