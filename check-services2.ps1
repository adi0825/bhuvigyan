$ports = @(8080,8084,8081,8082,8083,8087,8086,8088,8092,8085,8090,8091,8093,8094,8095,8096)
$names = @('gateway','location','farmer','admin','claims','notification','kyc','report','insurer','cce','carbon','analytics','scheduler','csc','officer','state')

Write-Host "=== HEALTH CHECK ==="
for ($i=0; $i -lt $ports.Length; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$i])/actuator/health" -TimeoutSec 5 -UseBasicParsing
        if ($r.StatusCode -eq 200) {
            Write-Host "$($names[$i]) ($($ports[$i])) : UP"
        } else {
            Write-Host "$($names[$i]) ($($ports[$i])) : DOWN"
        }
    } catch {
        Write-Host "$($names[$i]) ($($ports[$i])) : DOWN"
    }
}

Write-Host ""
Write-Host "=== LOG FILE LAST 2 LINES ==="
for ($i=0; $i -lt $names.Length; $i++) {
    $logPath = "C:\Users\athar\Desktop\Agri\logs\$($names[$i]).log"
    if (Test-Path $logPath) {
        $content = Get-Content $logPath -Tail 2
        Write-Host "--- $($names[$i]) (port $($ports[$i])) ---"
        $content | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "--- $($names[$i]) (port $($ports[$i])) ---"
        Write-Host "Log file not found"
    }
}