$env:PATH = "C:\Users\athar\Desktop\Agri\apache-maven-3.9.15\bin;$env:PATH"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"

$services = @(
    @{name="farmer-service"; port=8081; path="C:\Users\athar\Desktop\Agri\backend\farmer-service"},
    @{name="admin-service"; port=8082; path="C:\Users\athar\Desktop\Agri\backend\admin-service"},
    @{name="claims-service"; port=8083; path="C:\Users\athar\Desktop\Agri\backend\claims-service"},
    @{name="analytics-service"; port=8091; path="C:\Users\athar\Desktop\Agri\backend\analytics-service"},
    @{name="insurer-service"; port=8092; path="C:\Users\athar\Desktop\Agri\backend\insurer-service"},
    @{name="cce-service"; port=8088; path="C:\Users\athar\Desktop\Agri\backend\cce-service"}
)

foreach ($svc in $services) {
    $cmd = "cd $($svc.path); `$env:SPRING_PROFILES_ACTIVE='local'; `$env:SERVER_PORT=$($svc.port); mvn spring-boot:run"
    Start-Process cmd -ArgumentList "/k", $cmd -WindowStyle Normal
    Write-Host "Started $($svc.name) on port $($svc.port)"
    Start-Sleep -Seconds 5
}

Write-Host "All services started. Check the opened windows for status."