$ErrorActionPreference = "Continue"
$env:PATH = "C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin;$env:PATH"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
$env:SPRING_PROFILES_ACTIVE = "local"
$env:SERVER_PORT = "8081"

$workDir = "C:\Users\athar\Desktop\Agri\backend\farmer-service"
Write-Host "Starting farmer-service..."

Set-Location $workDir
& mvn spring-boot:run 2>&1