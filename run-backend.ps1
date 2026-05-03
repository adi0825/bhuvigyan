# Terminal 1: Core Infrastructure and Backends
$env:COMPOSE_PARALLEL_LIMIT=1
Write-Host "🧹 Cleaning up old containers and orphans..." -ForegroundColor Gray
docker compose down --remove-orphans

Write-Host "🚀 Starting Bhuvigyan Infrastructure (DBs, Kafka, Redis)..." -ForegroundColor Cyan
docker compose up -d postgres redis minio zookeeper kafka cassandra elasticsearch

Write-Host "☕ Starting Spring Boot Backends (Sequential Build)..." -ForegroundColor Yellow
docker compose up --build -d farmer-service claims-service location-service insurer-service admin-service notification-service report-service cce-service kyc-service analytics-service scheduler-service carbon-service land-api-service ml-service ml-worker carbon-ml-service gateway
