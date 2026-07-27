[CmdletBinding()]
param(
    [string]$OutputDirectory = "",
    [switch]$SkipTests,
    [switch]$SkipDockerBuild
)

$ErrorActionPreference = "Stop"

$repository = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$distRoot = Join-Path $repository "dist"
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $distRoot "VoiceForge-Portable"
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
$allowedRoot = [IO.Path]::GetFullPath($distRoot) + [IO.Path]::DirectorySeparatorChar
if (-not ($output + [IO.Path]::DirectorySeparatorChar).StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Le dossier de sortie doit rester dans $distRoot"
}
if (-not (Test-Path $output)) {
    throw "Le dossier portable est introuvable : $output. Utilisez scripts\build-portable.ps1 pour le créer."
}

if (-not $SkipTests) {
    Write-Host "[1/5] Tests Node"
    & npm test
    if ($LASTEXITCODE) { throw "Les tests ont échoué." }
} else {
    Write-Host "[1/5] Tests ignorés"
}

Write-Host "[2/5] Recompilation de VoiceForge.exe"
& cargo build --release --manifest-path (Join-Path $repository "src-tauri\Cargo.toml")
if ($LASTEXITCODE) { throw "La compilation Tauri a échoué." }

$compiledExe = Join-Path $repository "src-tauri\target\release\voice-forge-portable.exe"
$portableExe = Join-Path $output "VoiceForge.exe"
if (-not (Test-Path $compiledExe)) {
    throw "Executable compilé introuvable : $compiledExe"
}
Copy-Item -LiteralPath $compiledExe -Destination $portableExe -Force

Write-Host "[3/5] Synchronisation de l'application portable"
$appOutput = Join-Path $output "app"
New-Item -ItemType Directory -Path $appOutput -Force | Out-Null

foreach ($relativePath in @("public", "src")) {
    $destination = Join-Path $appOutput $relativePath
    if (Test-Path $destination) {
        $resolvedDestination = (Resolve-Path $destination).Path
        if (-not ($resolvedDestination + [IO.Path]::DirectorySeparatorChar).StartsWith(($appOutput + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refus de nettoyer un dossier extérieur au portable : $resolvedDestination"
        }
        Remove-Item -LiteralPath $resolvedDestination -Recurse -Force
    }
    Copy-Item -LiteralPath (Join-Path $repository $relativePath) -Destination $destination -Recurse -Force
}

foreach ($file in @("package.json", "package-lock.json")) {
    Copy-Item -LiteralPath (Join-Path $repository $file) -Destination (Join-Path $appOutput $file) -Force
}

$inferenceOutput = Join-Path $appOutput "inference"
New-Item -ItemType Directory -Path $inferenceOutput -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repository "inference\app.py") -Destination (Join-Path $inferenceOutput "app.py") -Force

Write-Host "[4/5] Vérification du portable"
$requiredMarkers = @{
    "app.js" = "FALLBACK_CONFIG"
    "index.html" = "app.js?v=20260727-score-layout-compact"
}
foreach ($entry in $requiredMarkers.GetEnumerator()) {
    $targetFile = Join-Path (Join-Path $appOutput "public") $entry.Key
    $content = Get-Content -LiteralPath $targetFile -Raw
    if (-not $content.Contains($entry.Value)) {
        throw "Marqueur attendu absent de $targetFile : $($entry.Value)"
    }
}

if (-not $SkipDockerBuild -and (Test-Path (Join-Path $output "USE_DOCKER"))) {
    Write-Host "[5/5] Reconstruction des images Docker tts-engine + voice-forge"
    & docker compose -f docker-compose.yml -f docker-compose.gpu.yml build tts-engine voice-forge
    if ($LASTEXITCODE) { throw "La reconstruction Docker a échoué." }
} else {
    Write-Host "[5/5] Reconstruction Docker ignorée"
}

$exe = Get-Item -LiteralPath $portableExe
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $portableExe).Hash
Write-Host "Portable mis à jour : $portableExe" -ForegroundColor Green
Write-Host "Taille : $($exe.Length) octets"
Write-Host "Modifié : $($exe.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "SHA256 : $hash"
