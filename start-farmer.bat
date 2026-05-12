@echo off
cd /d C:\Users\athar\Desktop\Agri\backend\farmer-service
set SPRING_PROFILES_ACTIVE=local
set SERVER_PORT=8081
C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin\mvn.cmd spring-boot:run