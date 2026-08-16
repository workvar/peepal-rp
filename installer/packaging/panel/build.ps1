# Builds the control panel and the hub for Windows.
#
#   $env:VERSION="1.0.0"; .\packaging\panel\build.ps1
#
# WebView2 is the only runtime requirement on the target machine, and Windows
# 11 (and patched Windows 10) already has it.
$ErrorActionPreference = "Stop"

$version = if ($env:VERSION) { $env:VERSION } else { "dev" }
$root    = Resolve-Path "$PSScriptRoot\..\.."
$out     = Join-Path $root "dist"
$ldflags = "-s -w -X github.com/peepal/installer/internal/buildinfo.Version=$version"
# REPO_TOKEN bakes read access to the private repository into the panel, so a
# customer never has to be handed a credential. Treat the resulting artefact
# as a secret and rotate the token when a relationship ends.
if ($env:REPO_TOKEN) {
  $ldflags += " -X github.com/peepal/installer/internal/setup.BuiltInToken=$($env:REPO_TOKEN)"
  Write-Warning "This build embeds a repository token; treat the artefacts as secrets."
}

New-Item -ItemType Directory -Force -Path $out | Out-Null
Set-Location $root

if (-not (Get-Command wails -ErrorAction SilentlyContinue)) {
  Write-Host "installing the wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  $env:PATH = "$env:PATH;$(go env GOPATH)\bin"
}

Write-Host "==> control panel $version"
Push-Location "cmd\peepal-panel"
# -webview2 embed bundles the bootstrapper, so a machine without WebView2
# still installs cleanly instead of showing a blank window.
wails build -clean -platform windows/amd64 -webview2 embed -ldflags "$ldflags"
Pop-Location
Copy-Item "cmd\peepal-panel\build\bin\peepal-panel.exe" "$out\peepal-panel.exe" -Force

Write-Host "==> hub $version"
$env:CGO_ENABLED = "0"
go build -ldflags "$ldflags" -o "$out\peepal-hub.exe" .\cmd\peepal-hub

Copy-Item "$root\peepal.yml" "$out\app.yml" -Force

Write-Host ""
Write-Host "built:"
Get-ChildItem $out | Format-Table Name, Length
