# Pause or resume the model run without losing it. Suspends every python.exe running one of this folder's scripts (CPU use drops to zero;
# memory stays held). Usage: powershell -File pause_run.ps1 pause|resume|status
param([Parameter(Position = 0)][string]$Action = 'status')
Add-Type -Namespace Win32 -Name Native -MemberDefinition @'
[DllImport("ntdll.dll")] public static extern int NtSuspendProcess(IntPtr h);
[DllImport("ntdll.dll")] public static extern int NtResumeProcess(IntPtr h);
'@
$pattern = 'experiments\.py|round3\.py|bakeoff|diffphys\.py|exp_data\.py|build_dataset\.py'
$found = Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -match $pattern }
if (-not $found) { Write-Output 'no run in progress'; exit 0 }
foreach ($f in $found) {
    $proc = Get-Process -Id $f.ProcessId
    if ($Action -eq 'pause') { [void][Win32.Native]::NtSuspendProcess($proc.Handle); Write-Output "paused pid $($f.ProcessId)" }
    elseif ($Action -eq 'resume') { [void][Win32.Native]::NtResumeProcess($proc.Handle); Write-Output "resumed pid $($f.ProcessId)" }
    else { Write-Output ("pid {0}  cpu {1:N0}s  mem {2:N0} MB  priority {3}" -f $f.ProcessId, $proc.CPU, ($proc.WorkingSet64 / 1MB), $proc.PriorityClass) }
}
