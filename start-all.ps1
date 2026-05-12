# ================================================================
#  BHUVIGYAN — FULL STACK STARTUP (NO DOCKER)
# ================================================================

$MVN = "$PSScriptRoot\apache-maven-3.9.15\bin\mvn.cmd"
if (-not (Test-Path $MVN)) { $MVN = "mvn" }

Write-Host "🚀 Starting Bhuvigyan Infrastructure Setup..." -ForegroundColor Cyan

# 1. Build Common Module
Write-Host "`n[1/3] Building Common Module..." -ForegroundColor Yellow
cd backend
& $MVN clean install -pl common -am -DskipTests
if ($LASTEXITCODE -ne 0) { Write-Host "X Build Failed!" -ForegroundColor Red; exit }

# 2. Start Services in New Windows
Write-Host "`n[2/3] Launching Java Services..." -ForegroundColor Yellow
$services = @("gateway", "location-service", "farmer-service", "admin-service", "claims-service", "kyc-service", "notification-service")

foreach ($s in $services) {
    Write-Host "  -> Starting $s..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot\backend\$s; `$env:SPRING_PROFILES_ACTIVE='local'; & '$MVN' spring-boot:run"
}

# 3. Start Frontend
Write-Host "`n[3/3] Launching React Frontend..." -ForegroundColor Yellow
cd "$PSScriptRoot\frontend\AGRI\artifacts\web"
if (-not (Test-Path "node_modules")) {
    Write-Host "  -> Installing dependencies..."
    npm install --silent
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\AGRI\artifacts\web'; npm run dev"

Write-Host "`n✅ All systems are launching!" -ForegroundColor Green
Write-Host "------------------------------------------------"
Write-Host "Portal:  http://localhost:3000"
Write-Host "Gateway: http://localhost:8080"
Write-Host "------------------------------------------------"
