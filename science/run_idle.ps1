# Run a repo script with the project python at Idle priority and a thread cap, so it stays out of the way on a work day.
# Arguments come from the IDLE_ARGS environment variable (space separated) because PowerShell parses --flags itself:
#   IDLE_ARGS="exp_data.py --bbe a.parquet --out b.parquet" powershell -File run_idle.ps1
# EXP_THREADS overrides the thread cap (default 3).
if (-not $env:EXP_THREADS) { $env:EXP_THREADS = '3' }
$pyArgs = @('-W', 'ignore') + ($env:IDLE_ARGS -split ' ' | Where-Object { $_ -ne '' })
$py = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
$p = Start-Process -FilePath $py -ArgumentList $pyArgs -PassThru -NoNewWindow -WorkingDirectory $PSScriptRoot
$p.PriorityClass = 'Idle'
$p.WaitForExit()
exit $p.ExitCode
