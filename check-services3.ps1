$ports = @(8080,8084,8081,8082,8083,8087,8086,8088,8092,8085,8090,8091,8093,8094,8095,8096)
$names = @('gateway','location','farmer','admin','claims','notification','kyc','report','insurer','cce','carbon','analytics','scheduler','csc','officer','state')

Write-Host "=== HEALTH CHECK ==="
$results = @()
for ($i=0; $i -lt $ports.Length; $i++) {
    $status = "DOWN"
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$i])/actuator/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { $status = "UP" }
    } catch {}
    $results += "$($names[$i]) ($($ports[$i])) : $status"
}
$results | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "=== LOG FILE LAST 2 LINES ==="
for ($i=0; $i -lt $names.Length; $i++) {
    $logPath = "C:\Users\athar\Desktop\Agri\logs\$($names[$i]).log"
    Write-Host "--- $($names[$i]) (port $($ports[$i])) ---"
    if (Test-Path $logPath) {
        Get-Content $logPath -Tail 2 | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "Log file not found"
    }
}