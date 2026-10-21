# Run a bash script of this folder at Below Normal priority. Child processes inherit the priority class, so every python step in the
# chain yields to normal applications. Usage: powershell -File run_below_normal.ps1   (RUN_SCRIPT env var picks the script, default run_tonight2.sh)
$script = if ($env:RUN_SCRIPT) { $env:RUN_SCRIPT } else { 'run_tonight2.sh' }
$bash = 'C:\Program Files\Git\usr\bin\bash.exe'
if (-not (Test-Path $bash)) { $bash = (Get-Command bash).Source }
$p = Start-Process -FilePath $bash -ArgumentList $script -PassThru -NoNewWindow -WorkingDirectory $PSScriptRoot
$p.PriorityClass = 'BelowNormal'
Write-Output "started $script as pid $($p.Id) at $($p.PriorityClass)"
$p.WaitForExit()
exit $p.ExitCode
