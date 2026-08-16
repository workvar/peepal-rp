# Windows installation script.
#
#   Right-click -> Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# It places the panel and the definition under Program Files, adds a Start
# menu shortcut, and opens the panel, which does the real work: prerequisites,
# clone, database, environment, build and service registration.
param(
  [switch]$Headless,
  [string]$Prefix = "$env:ProgramFiles\Peepal"
)
$ErrorActionPreference = "Stop"

$displayName = "Peepal ERP"
$here = $PSScriptRoot

# Elevation. Installing packages, binding port 80 and registering a service
# all need the administrator token.
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Re-launching as administrator..."
  $args = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
  if ($Headless) { $args += " -Headless" }
  Start-Process powershell -Verb RunAs -ArgumentList $args
  exit
}

Write-Host "==> Installing $displayName control panel into $Prefix"
New-Item -ItemType Directory -Force -Path "$Prefix\bin", "$Prefix\share" | Out-Null
Copy-Item "$here\peepal-panel.exe" "$Prefix\bin\peepal-panel.exe" -Force
Copy-Item "$here\app.yml"          "$Prefix\share\app.yml"        -Force

# winget is how the panel installs Git, Go and Node. Warn rather than fail:
# the panel falls back to downloading the vendors' archives.
if (-not (Get-Command winget -ErrorAction SilentlyContinue) -and
    -not (Get-Command choco  -ErrorAction SilentlyContinue)) {
  Write-Warning "Neither winget nor Chocolatey was found. Go and Node will be downloaded directly; Git must be installed by hand if it is missing."
}

$startMenu = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
$shortcut  = "$startMenu\$displayName Control Panel.lnk"
$shell = New-Object -ComObject WScript.Shell
$link  = $shell.CreateShortcut($shortcut)
$link.TargetPath       = "$Prefix\bin\peepal-panel.exe"
$link.Arguments        = "-config `"$Prefix\share\app.yml`""
$link.WorkingDirectory = "$Prefix\bin"
$link.Description      = "Install, supervise and monitor $displayName"
$link.Save()

Write-Host "==> Starting the control panel"
if ($Headless) {
  & "$Prefix\bin\peepal-panel.exe" -headless -config "$Prefix\share\app.yml"
} else {
  Start-Process "$Prefix\bin\peepal-panel.exe" -ArgumentList "-config `"$Prefix\share\app.yml`""
  Write-Host "The control panel is open. It is also in the Start menu as `"$displayName Control Panel`"."
}
