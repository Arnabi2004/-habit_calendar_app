$ErrorActionPreference = "Stop"

$localPython = Get-Command python -ErrorAction SilentlyContinue
$bundledPython = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if ($localPython) {
    & $localPython.Source "$PSScriptRoot\app.py"
} elseif (Test-Path $bundledPython) {
    & $bundledPython "$PSScriptRoot\app.py"
} else {
    Write-Error "Python was not found. Install Python or run this inside Codex with the bundled runtime available."
}
