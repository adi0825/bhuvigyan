$ErrorActionPreference = "Stop"

Write-Host "================================================="
Write-Host "  BHUVIGYAN - SEQUENTIAL BUILD SCRIPT"
Write-Host "================================================="
Write-Host "This script builds services one by one to prevent"
Write-Host "Docker from running out of memory (OOM)."
Write-Host ""

Write-Host "1. Starting Core Infrastructure..."
docker compose up -d postgres redis kafka zookeeper cassandra minio minio-init

Write-Host "Waiting 15 seconds for infrastructure to stabilize..."
Start-Sleep -Seconds 15

# List of all Java microservices
$javaServices = @(
    "gateway", 
    "common", # (Common isn't a service, but just in case it triggers a build)
    "location-service", 
    "kyc-service", 
    "land-api-service", 
    "notification-service",
    "report-service",
    "farmer-service",
    "admin-service",
    "cce-service",
    "claims-service"
)

Write-Host "`n2. Building Java Microservices sequentially..."
foreach ($service in $javaServices) {
    if ($service -ne "common") {
        Write-Host "--> Building $service..."
        docker compose build $service
    }
}

Write-Host "`n3. Building Python ML Service..."
docker compose build ml-service
docker compose build ml-worker

Write-Host "`n4. Building Angular Portals sequentially..."
$angularServices = @("angular-farmer", "angular-admin", "angular-csc", "angular-inspector")
foreach ($app in $angularServices) {
    Write-Host "--> Building $app..."
    docker compose build $app
}

Write-Host "`n5. Starting all services..."
docker compose up -d

Write-Host "================================================="
Write-Host "  BUILD COMPLETE! All services are starting up."
Write-Host "================================================="
