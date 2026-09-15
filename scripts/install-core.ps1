# ================================================================
# NEXYRIS LOCAL - AUTOMATED USB SETUP & ENGINE/MODEL INSTALLER
# ================================================================

$ErrorActionPreference = "Continue"
$USB_Drive = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   NEXYRIS LOCAL STUDIO - USB Environment Setup           " -ForegroundColor Cyan
Write-Host "   100% Portable  |  All Data Stored on USB               " -ForegroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure directory structure on USB
$modelsDir = Join-Path $USB_Drive "models\gguf"
$binDir = Join-Path $USB_Drive "bin"
$downloadsDir = Join-Path $USB_Drive "downloads"

New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null

function Get-USBFreeSpaceGB {
    try {
        $driveLetter = (Get-Item $USB_Drive).PSDrive.Name
        $drive = Get-PSDrive $driveLetter -ErrorAction SilentlyContinue
        if ($drive) {
            return [math]::Round($drive.Free / 1GB, 1)
        }
    } catch {}
    return -1
}

$freeGB = Get-USBFreeSpaceGB
if ($freeGB -gt 0) {
    Write-Host "  USB Pendrive Free Space: $freeGB GB" -ForegroundColor Green
    Write-Host "  USB Root Directory: $USB_Drive" -ForegroundColor DarkGray
    Write-Host ""
}

# 1. Setup Portable llama.cpp engine if not present
$llamaServer = Join-Path $binDir "llama-server.exe"
if (-not (Test-Path $llamaServer)) {
    Write-Host "[1/2] Installing portable llama.cpp AI engine to USB..." -ForegroundColor Yellow
    $engineZipUrl = "https://github.com/ggerganov/llama.cpp/releases/download/b4500/llama-b4500-bin-win-cpu-x64.zip"
    $tempZip = Join-Path $binDir "llama-engine.zip"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Write-Host "  Downloading engine binary (~16 MB)..." -ForegroundColor DarkGray
        Invoke-WebRequest -Uri $engineZipUrl -OutFile $tempZip -UseBasicParsing
        Expand-Archive -Path $tempZip -DestinationPath $binDir -Force
        Remove-Item -Force $tempZip -ErrorAction SilentlyContinue
        Write-Host "  Engine installed successfully in bin\" -ForegroundColor Green
    } catch {
        Write-Host "  Engine auto-download skipped (will be available via UI or host Ollama)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[1/2] Portable AI engine already verified in USB bin\ directory." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] Choose AI Model(s) to install onto USB pendrive:" -ForegroundColor Yellow
Write-Host ""

$Catalog = @(
    @{ Num = "1"; Name = "NemoMix Unleashed 12B"; Size = "7.0 GB"; Label = "UNCENSORED"; URL = "https://huggingface.co/bartowski/NemoMix-Unleashed-12B-GGUF/resolve/main/NemoMix-Unleashed-12B-Q4_K_M.gguf"; File = "NemoMix-Unleashed-12B-Q4_K_M.gguf" },
    @{ Num = "2"; Name = "Dolphin 2.9 Llama 3 8B"; Size = "4.9 GB"; Label = "UNCENSORED"; URL = "https://huggingface.co/bartowski/dolphin-2.9-llama3-8b-GGUF/resolve/main/dolphin-2.9-llama3-8b-Q4_K_M.gguf"; File = "dolphin-2.9-llama3-8b-Q4_K_M.gguf" },
    @{ Num = "3"; Name = "Mistral 7B Instruct v0.3"; Size = "4.1 GB"; Label = "STANDARD / CODING"; URL = "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"; File = "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf" },
    @{ Num = "4"; Name = "Qwen 2.5 7B Instruct"; Size = "4.7 GB"; Label = "STANDARD / MULTILINGUAL"; URL = "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf"; File = "Qwen2.5-7B-Instruct-Q4_K_M.gguf" },
    @{ Num = "5"; Name = "Llama 3.2 3B Instruct"; Size = "2.0 GB"; Label = "LIGHTWEIGHT"; URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"; File = "Llama-3.2-3B-Instruct-Q4_K_M.gguf" },
    @{ Num = "6"; Name = "Phi-3.5 Mini 3.8B"; Size = "2.2 GB"; Label = "REASONING"; URL = "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"; File = "Phi-3.5-mini-instruct-Q4_K_M.gguf" },
    @{ Num = "7"; Name = "SmolLM2 135M Instruct"; Size = "115 MB"; Label = "INSTANT USB TEST"; URL = "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf"; File = "smollm2-135m-instruct-q4_k_m.gguf" },
    @{ Num = "S"; Name = "Skip Model Download"; Size = "0 MB"; Label = "LAUNCH IMMEDIATELY"; URL = ""; File = "" }
)

foreach ($item in $Catalog) {
    $color = if ($item.Label -match "UNCENSORED") { "Red" } else { "Cyan" }
    Write-Host "  [$($item.Num)] " -NoNewline -ForegroundColor Yellow
    Write-Host "$($item.Name) " -NoNewline -ForegroundColor White
    Write-Host "($($item.Size)) " -NoNewline -ForegroundColor DarkGray
    Write-Host "[$($item.Label)]" -ForegroundColor $color
}

Write-Host ""
$choice = Read-Host "  Enter model selection (e.g. 5 or 7 or S to skip)"

if ($choice -and $choice.ToUpper() -ne "S") {
    $selected = $Catalog | Where-Object { $_.Num -eq $choice }
    if ($selected -and $selected.URL) {
        $destFile = Join-Path $modelsDir $selected.File
        if (Test-Path $destFile) {
            Write-Host "  Model already downloaded at $destFile" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  Downloading $($selected.Name) to USB ($destFile)..." -ForegroundColor Yellow
            try {
                Invoke-WebRequest -Uri $selected.URL -OutFile $destFile -UseBasicParsing
                Write-Host "  Download complete!" -ForegroundColor Green
            } catch {
                Write-Host "  Download failed: $_. You can also download it inside the web UI." -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "  USB Pendrive setup is ready." -ForegroundColor Green
