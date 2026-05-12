Write-Host "Building backend modules..."
& "C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin\mvn.cmd" -f "C:\Users\athar\Desktop\Agri\backend\pom.xml" clean install -DskipTests -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!"
    exit 1
}

Write-Host "Build successful. Starting services..."

$services = @(
    @{dir='gateway'; port=8080},
    @{dir='location-service'; port=8084},
    @{dir='farmer-service'; port=8081},
    @{dir='admin-service'; port=8082},
    @{dir='claims-service'; port=8083},
    @{dir='notification-service'; port=8087},
    @{dir='kyc-service'; port=8086},
    @{dir='report-service'; port=8088},
    @{dir='insurer-service'; port=8092},
    @{dir='cce-service'; port=8085},
    @{dir='carbon-service'; port=8090},
    @{dir='analytics-service'; port=8091},
    @{dir='scheduler-service'; port=8093},
    @{dir='csc-service'; port=8094},
    @{dir='officer-service'; port=8095},
    @{dir='state-service'; port=8096}
)

foreach ($s in $services) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d C:\Users\athar\Desktop\Agri\backend\$($s.dir); set SERVER_PORT=$($s.port); set SPRING_PROFILES_ACTIVE=local; C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin\mvn.cmd spring-boot:run" -PassThru | Out-Null
    Write-Host "Started $($s.dir) on port $($s.port)"
    Start-Sleep -Milliseconds 300
}

Write-Host "All services started, waiting 90 seconds..."
Start-Sleep -Seconds 90