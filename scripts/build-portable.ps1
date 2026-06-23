[CmdletBinding()]
param(
    [string]$OutputDirectory = "",
    [switch]$SkipModels
)

$ErrorActionPreference = "Stop"
$repository = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$distRoot = Join-Path $repository "dist"
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $distRoot "VoiceForge-Portable"
}
$output = [IO.Path]::GetFullPath($OutputDirectory)
$allowedRoot = [IO.Path]::GetFullPath($distRoot) + [IO.Path]::DirectorySeparatorChar
if (-not $output.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Le dossier de sortie doit rester dans $distRoot"
}

Write-Host "[1/7] Compilation de VoiceForge.exe"
& cargo build --release --manifest-path (Join-Path $repository "src-tauri\Cargo.toml")
if ($LASTEXITCODE) { throw "La compilation Tauri a échoué." }

if (Test-Path $output) {
    $resolvedOutput = (Resolve-Path $output).Path
    if (-not ($resolvedOutput + [IO.Path]::DirectorySeparatorChar).StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refus de nettoyer un dossier extérieur à dist."
    }
    Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}
New-Item -ItemType Directory -Path $output | Out-Null
foreach ($directory in "app", "app\inference", "runtime\node", "runtime\python", "runtime\sox", "models", "logs") {
    New-Item -ItemType Directory -Path (Join-Path $output $directory) -Force | Out-Null
}
Copy-Item (Join-Path $repository "src-tauri\target\release\voice-forge-portable.exe") (Join-Path $output "VoiceForge.exe")

Write-Host "[2/7] Copie de l'application locale"
Copy-Item (Join-Path $repository "public") (Join-Path $output "app\public") -Recurse
Copy-Item (Join-Path $repository "src") (Join-Path $output "app\src") -Recurse
Copy-Item (Join-Path $repository "package.json") (Join-Path $output "app\package.json")
Copy-Item (Join-Path $repository "package-lock.json") (Join-Path $output "app\package-lock.json")
Copy-Item (Join-Path $repository "inference\app.py") (Join-Path $output "app\inference\app.py")
& npm ci --omit=dev --prefix (Join-Path $output "app")
if ($LASTEXITCODE) { throw "Installation des modules Node impossible." }

Write-Host "[3/7] Copie du runtime Node.js"
$node = (Get-Command node -ErrorAction Stop).Source
Copy-Item $node (Join-Path $output "runtime\node\node.exe")

Write-Host "[4/7] Création du Python 3.11 embarqué"
$downloads = Join-Path $distRoot ".downloads"
New-Item -ItemType Directory -Path $downloads -Force | Out-Null
$pythonZip = Join-Path $downloads "python-3.11.9-embed-amd64.zip"
if (-not (Test-Path $pythonZip)) {
    Invoke-WebRequest "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip" -OutFile $pythonZip
}
Expand-Archive $pythonZip (Join-Path $output "runtime\python") -Force
$pythonRoot = Join-Path $output "runtime\python"
$embeddedPython = Join-Path $pythonRoot "python.exe"
@"
python311.zip
.
Lib\site-packages
import site
"@ | Set-Content (Join-Path $pythonRoot "python311._pth") -Encoding ascii
$getPip = Join-Path $downloads "get-pip.py"
if (-not (Test-Path $getPip)) {
    Invoke-WebRequest "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
}
& $embeddedPython $getPip --no-warn-script-location
& $embeddedPython -m pip install --no-cache-dir torch==2.7.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu118
& $embeddedPython -m pip install --no-cache-dir qwen-tts==0.1.1 bitsandbytes==0.46.1 fastapi==0.115.12 "uvicorn[standard]==0.34.3"
if ($LASTEXITCODE) { throw "Construction du runtime Python impossible." }

Write-Host "[5/7] Ajout de SoX"
$soxZip = Join-Path $downloads "sox-14.4.2-win32.zip"
if (-not (Test-Path $soxZip)) {
    & curl.exe -L --fail --output $soxZip "https://downloads.sourceforge.net/project/sox/sox/14.4.2/sox-14.4.2-win32.zip"
    if ($LASTEXITCODE) { throw "Téléchargement de SoX impossible." }
}
$soxTemp = Join-Path $downloads "sox-expanded"
if (Test-Path $soxTemp) { Remove-Item -LiteralPath $soxTemp -Recurse -Force }
Expand-Archive $soxZip $soxTemp
$soxExecutable = Get-ChildItem $soxTemp -Filter sox.exe -Recurse | Select-Object -First 1
if (-not $soxExecutable) { throw "sox.exe est absent de l'archive." }
Copy-Item (Join-Path $soxExecutable.Directory.FullName "*") (Join-Path $output "runtime\sox") -Recurse -Force

Write-Host "[6/7] Mise en cache des modèles Qwen"
if (-not $SkipModels) {
    $env:HF_HOME = Join-Path $output "models"
    & $embeddedPython (Join-Path $repository "scripts\cache_offline_models.py")
    if ($LASTEXITCODE) { throw "Téléchargement des modèles impossible." }
} else {
    Write-Warning "Les modèles ont été ignorés : ce paquet de test ne sera pas autonome."
}

Write-Host "[7/7] Validation du paquet portable"
& $embeddedPython -c "import torch, qwen_tts, fastapi, uvicorn, soundfile; print('Runtime Python OK', torch.__version__)"
if ($LASTEXITCODE) { throw "Le runtime Python portable est incomplet." }
@"
VOICE FORGE PORTABLE
====================

Double-cliquez sur VoiceForge.exe.
Aucune installation, aucun Docker et aucune connexion Internet ne sont requis.
Le pilote NVIDIA doit être installé. Les journaux sont placés dans le dossier logs.
Ne déplacez pas VoiceForge.exe hors de ce dossier.
"@ | Set-Content (Join-Path $output "LISEZ-MOI.txt") -Encoding utf8

$size = [math]::Round((Get-ChildItem $output -File -Recurse | Measure-Object Length -Sum).Sum / 1GB, 2)
Write-Host "Paquet terminé : $output ($size Go)" -ForegroundColor Green
