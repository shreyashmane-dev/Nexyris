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
$tempDir = Join-Path $USB_Drive "temp"

New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Redirect temporary files strictly to USB pendrive
$env:TEMP = $tempDir
$env:TMP = $tempDir

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

function Format-Bytes {
    param([double]$Bytes)
    if ($Bytes -ge 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -ge 1MB) { return "{0:N1} MB" -f ($Bytes / 1MB) }
    if ($Bytes -ge 1KB) { return "{0:N1} KB" -f ($Bytes / 1KB) }
    return "{0} B" -f [math]::Round($Bytes)
}

function Format-Eta {
    param([double]$Seconds)
    if ($Seconds -le 0 -or [double]::IsInfinity($Seconds) -or [double]::IsNaN($Seconds)) { return "--:--" }
    $ts = [timespan]::FromSeconds([math]::Round($Seconds))
    if ($ts.TotalHours -ge 1) { return "{0:D2}h {1:D2}m {2:D2}s" -f [int]$ts.TotalHours, $ts.Minutes, $ts.Seconds }
    return "{0:D2}m {1:D2}s" -f $ts.Minutes, $ts.Seconds
}

function Download-WithInteractiveProgress {
    param(
        [string]$Url,
        [string]$DestinationPath,
        [string]$DisplayName = "File"
    )

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    } catch {}

    $destDir = Split-Path -Parent $DestinationPath
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    $partPath = "$DestinationPath.part"
    $maxRetries = 5
    $attempt = 0
    $downloadedBytes = [int64]0
    if (Test-Path $partPath) {
        $downloadedBytes = (Get-Item $partPath).Length
    }

    $totalBytes = [int64]-1
    $totalStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $spinnerFrames = @('[ | ]', '[ / ]', '[ - ]', '[ \ ]')
    $spinnerIdx = 0
    $barWidth = 18

    while ($attempt -le $maxRetries) {
        $fileStream = $null
        $responseStream = $null
        $response = $null

        try {
            $request = [System.Net.HttpWebRequest]::Create($Url)
            $request.Method = "GET"
            $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Nexyris/1.0"
            $request.AllowAutoRedirect = $true
            $request.Timeout = 60000

            if ($downloadedBytes -gt 0) {
                $request.AddRange([int64]$downloadedBytes)
            }

            $response = $request.GetResponse()
            $contentLen = $response.ContentLength
            if ($totalBytes -le 0) {
                $totalBytes = if ($downloadedBytes -gt 0) { $downloadedBytes + $contentLen } else { $contentLen }
            }

            $responseStream = $response.GetResponseStream()
            $fileMode = if ($downloadedBytes -gt 0) { [System.IO.FileMode]::Append } else { [System.IO.FileMode]::Create }
            $fileStream = New-Object System.IO.FileStream($partPath, $fileMode, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)

            $buffer = New-Object byte[] 131072 # 128 KB high-speed buffer
            $renderStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $speedStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $speedBytes = [int64]0
            $smoothedSpeed = [double]0

            while (($bytesRead = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $fileStream.Write($buffer, 0, $bytesRead)
                $downloadedBytes += $bytesRead
                $speedBytes += $bytesRead

                # Smooth speed calculation every 350ms
                if ($speedStopwatch.ElapsedMilliseconds -ge 350) {
                    $elapsedSec = $speedStopwatch.Elapsed.TotalSeconds
                    $instantSpeed = if ($elapsedSec -gt 0) { $speedBytes / $elapsedSec } else { 0 }
                    if ($smoothedSpeed -eq 0) {
                        $smoothedSpeed = $instantSpeed
                    } else {
                        $smoothedSpeed = ($smoothedSpeed * 0.7) + ($instantSpeed * 0.3)
                    }
                    $speedBytes = 0
                    $speedStopwatch.Restart()
                }

                # Update interactive console animation every 90ms
                if ($renderStopwatch.ElapsedMilliseconds -ge 90) {
                    $spinner = $spinnerFrames[$spinnerIdx % $spinnerFrames.Count]
                    $spinnerIdx++

                    $speedStr = (Format-Bytes $smoothedSpeed) + "/s"
                    $doneStr = Format-Bytes $downloadedBytes

                    if ($totalBytes -gt 0) {
                        $pct = [math]::Min(100.0, ($downloadedBytes / $totalBytes) * 100.0)
                        $remBytes = [math]::Max([int64]0, $totalBytes - $downloadedBytes)
                        $remStr = Format-Bytes $remBytes
                        $etaSec = if ($smoothedSpeed -gt 0) { $remBytes / $smoothedSpeed } else { -1 }
                        $etaStr = Format-Eta $etaSec

                        $filled = [math]::Floor($barWidth * ($pct / 100.0))
                        $empty = $barWidth - $filled
                        $bar = ("#" * $filled) + ("-" * $empty)

                        $line = ("  {0} [{1}] {2,5:F1}% | {3,9} | {4} / {5} | Rem: {6} | ETA: {7}" -f `
                            $spinner, $bar, $pct, $speedStr, $doneStr, (Format-Bytes $totalBytes), $remStr, $etaStr)
                    } else {
                        $line = ("  {0} [ STREAMING ] | {1,9} | {2} downloaded | Elapsed: {3}" -f `
                            $spinner, $speedStr, $doneStr, (Format-Eta $totalStopwatch.Elapsed.TotalSeconds))
                    }

                    $padded = $line.PadRight(105)
                    Write-Host -NoNewline ("`r" + $padded)
                    $renderStopwatch.Restart()
                }
            }

            # If we reached here without error, download finished successfully
            $fileStream.Flush()
            $fileStream.Close()
            $fileStream.Dispose()
            $responseStream.Close()
            $responseStream.Dispose()
            $response.Close()

            $totalStopwatch.Stop()
            $totalSec = [math]::Max(1.0, $totalStopwatch.Elapsed.TotalSeconds)
            $avgSpeed = $downloadedBytes / $totalSec

            if (Test-Path $DestinationPath) {
                Remove-Item -Force $DestinationPath -ErrorAction SilentlyContinue
            }
            Move-Item -Path $partPath -Destination $DestinationPath -Force

            Write-Host -NoNewline ("`r" + (" " * 105) + "`r")
            Write-Host ("  [SUCCESS] {0} installed! ({1} in {2}, avg {3}/s)" -f `
                $DisplayName, (Format-Bytes $downloadedBytes), (Format-Eta $totalSec), (Format-Bytes $avgSpeed)) -ForegroundColor Green
            return $true

        } catch {
            if ($fileStream) { $fileStream.Flush(); $fileStream.Close(); $fileStream.Dispose() }
            if ($responseStream) { $responseStream.Close(); $responseStream.Dispose() }
            if ($response) { $response.Close() }

            $attempt++
            if ($attempt -le $maxRetries) {
                $backoffSec = [math]::Min($attempt * 2, 10)
                Write-Host ""
                Write-Host ("  [RECONNECTING] Internet interrupted ($($_.Exception.Message)). Resuming from {0} in {1}s (Attempt {2}/{3})..." -f `
                    (Format-Bytes $downloadedBytes), $backoffSec, $attempt, $maxRetries) -ForegroundColor Yellow
                Start-Sleep -Seconds $backoffSec
            } else {
                Write-Host ""
                Write-Host "  [ERROR] Download failed after multiple attempts: $_" -ForegroundColor Red
                return $false
            }
        }
    }
    return $false
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
    $engineZipUrl = "https://github.com/ggml-org/llama.cpp/releases/download/b3500/llama-b3500-bin-win-avx2-x64.zip"
    $tempZip = Join-Path $binDir "llama-engine.zip"

    $downloadSuccess = Download-WithInteractiveProgress -Url $engineZipUrl -DestinationPath $tempZip -DisplayName "llama.cpp AI engine (~16 MB)"
    if ($downloadSuccess -and (Test-Path $tempZip)) {
        try {
            Write-Host "  Extracting portable engine binaries to bin\..." -ForegroundColor DarkGray
            Expand-Archive -Path $tempZip -DestinationPath $binDir -Force
            Remove-Item -Force $tempZip -ErrorAction SilentlyContinue
            Write-Host "  Engine installed successfully in bin\" -ForegroundColor Green
        } catch {
            Write-Host "  Could not extract engine zip. You can install it via the web UI." -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  Engine auto-download skipped (will be available via UI or host Ollama)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[1/2] Portable AI engine already verified in USB bin\ directory." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] AI Model Setup — Dynamic Online Hub & Curated Library" -ForegroundColor Yellow
Write-Host "  Checking Hugging Face Hub for live trending models..." -ForegroundColor DarkGray

function Search-HuggingFaceHub {
    param([string]$Query, [int]$Limit = 6)
    try {
        $cleanQ = [System.Uri]::EscapeDataString($Query + " gguf")
        $url = "https://huggingface.co/api/models?search=$cleanQ&filter=gguf&sort=downloads&direction=-1&limit=$Limit"
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Method = "GET"
        $req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nexyris/1.0"
        $req.Timeout = 8000
        $res = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
        $json = $reader.ReadToEnd()
        $reader.Close()
        $res.Close()
        return (ConvertFrom-Json $json)
    } catch {
        return @()
    }
}

$Catalog = @(
    @{ Num = "1"; Name = "NemoMix Unleashed 12B"; Size = "7.0 GB"; Label = "UNCENSORED"; URL = "https://huggingface.co/bartowski/NemoMix-Unleashed-12B-GGUF/resolve/main/NemoMix-Unleashed-12B-Q4_K_M.gguf"; File = "NemoMix-Unleashed-12B-Q4_K_M.gguf" },
    @{ Num = "2"; Name = "Dolphin 2.9 Llama 3 8B"; Size = "4.9 GB"; Label = "UNCENSORED"; URL = "https://huggingface.co/bartowski/dolphin-2.9-llama3-8b-GGUF/resolve/main/dolphin-2.9-llama3-8b-Q4_K_M.gguf"; File = "dolphin-2.9-llama3-8b-Q4_K_M.gguf" },
    @{ Num = "3"; Name = "Mistral 7B Instruct v0.3"; Size = "4.1 GB"; Label = "STANDARD / CODING"; URL = "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"; File = "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf" },
    @{ Num = "4"; Name = "Qwen 2.5 7B Instruct"; Size = "4.7 GB"; Label = "STANDARD / MULTILINGUAL"; URL = "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf"; File = "Qwen2.5-7B-Instruct-Q4_K_M.gguf" },
    @{ Num = "5"; Name = "Llama 3.2 3B Instruct"; Size = "2.0 GB"; Label = "LIGHTWEIGHT"; URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"; File = "Llama-3.2-3B-Instruct-Q4_K_M.gguf" },
    @{ Num = "6"; Name = "Phi-3.5 Mini 3.8B"; Size = "2.2 GB"; Label = "REASONING"; URL = "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"; File = "Phi-3.5-mini-instruct-Q4_K_M.gguf" },
    @{ Num = "7"; Name = "SmolLM2 135M Instruct"; Size = "100 MB"; Label = "INSTANT USB TEST"; URL = "https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf"; File = "SmolLM2-135M-Instruct-Q4_K_M.gguf" },
    @{ Num = "8"; Name = "Llama 3.2 1B Instruct"; Size = "807 MB"; Label = "FAST / TINY"; URL = "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"; File = "Llama-3.2-1B-Instruct-Q4_K_M.gguf" }
)

Write-Host ""
foreach ($item in $Catalog) {
    $color = if ($item.Label -match "UNCENSORED") { "Red" } else { "Cyan" }
    Write-Host "  [$($item.Num)] " -NoNewline -ForegroundColor Yellow
    Write-Host "$($item.Name) " -NoNewline -ForegroundColor White
    Write-Host "($($item.Size)) " -NoNewline -ForegroundColor DarkGray
    Write-Host "[$($item.Label)]" -ForegroundColor $color
}
Write-Host "  [S] " -NoNewline -ForegroundColor Yellow
Write-Host "Search Hugging Face Hub " -NoNewline -ForegroundColor White
Write-Host "(Type any model keyword online: e.g. deepseek, qwen, coder)" -ForegroundColor DarkCyan
Write-Host "  [0] " -NoNewline -ForegroundColor Yellow
Write-Host "Skip Model Setup " -NoNewline -ForegroundColor White
Write-Host "(Launch studio immediately)" -ForegroundColor DarkGray

Write-Host ""
$choice = Read-Host "  Enter model selection (e.g. 5, 7, 8, or 'S' to search online, '0' to skip)"

if ($choice -and $choice.Trim().ToUpper() -eq "S") {
    $searchKey = Read-Host "  Enter search keyword (e.g. 'deepseek', 'qwen'): "
    if ($searchKey -and $searchKey.Trim()) {
        Write-Host "  Querying Hugging Face online for '$searchKey'..." -ForegroundColor DarkGray
        $results = Search-HuggingFaceHub -Query $searchKey.Trim() -Limit 6
        if ($results -and $results.Count -gt 0) {
            Write-Host ""
            Write-Host "  Live Search Results from Hugging Face:" -ForegroundColor Cyan
            $idx = 1
            $searchList = @()
            foreach ($r in $results) {
                $repoName = if ($r.id -match "/") { $r.id.Split("/")[1] } else { $r.id }
                $cleanName = $repoName -replace "-GGUF$", "" -replace "_", " "
                $defaultFile = "$($repoName -replace '-GGUF$', '')-Q4_K_M.gguf"
                $directUrl = "https://huggingface.co/$($r.id)/resolve/main/$defaultFile"
                $downloads = if ($r.downloads) { $r.downloads } else { 0 }
                
                $searchList += @{ Num = "$idx"; Name = $cleanName; URL = $directUrl; File = $defaultFile; Repo = $r.id }
                Write-Host "    [$idx] " -NoNewline -ForegroundColor Yellow
                Write-Host "$cleanName " -NoNewline -ForegroundColor White
                Write-Host "($downloads downloads) " -NoNewline -ForegroundColor DarkGray
                Write-Host "[$($r.id)]" -ForegroundColor DarkCyan
                $idx++
            }
            Write-Host ""
            $pick = Read-Host "  Select search result number to download (or 0 to cancel)"
            $chosenItem = $searchList | Where-Object { $_.Num -eq $pick.Trim() }
            if ($chosenItem) {
                $destFile = Join-Path $modelsDir $chosenItem.File
                Write-Host ""
                Write-Host "  Downloading $($chosenItem.Name) from Hugging Face..." -ForegroundColor Yellow
                Download-WithInteractiveProgress -Url $chosenItem.URL -DestinationPath $destFile -DisplayName $chosenItem.Name | Out-Null
            }
        } else {
            Write-Host "  No matching GGUF models found online for '$searchKey'." -ForegroundColor Yellow
        }
    }
} elseif ($choice -and $choice.Trim() -ne "0" -and $choice.Trim().ToUpper() -ne "S") {
    $selected = $Catalog | Where-Object { $_.Num -eq $choice.Trim() }
    if ($selected -and $selected.URL) {
        $destFile = Join-Path $modelsDir $selected.File
        if (Test-Path $destFile) {
            Write-Host "  Model already downloaded at $destFile" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  Starting download of $($selected.Name) to USB..." -ForegroundColor Yellow
            $success = Download-WithInteractiveProgress -Url $selected.URL -DestinationPath $destFile -DisplayName $selected.Name
            if (-not $success) {
                Write-Host "  Tip: You can also download models directly inside the Nexyris Web UI." -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "  Invalid selection or skipped." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  USB Pendrive setup is ready." -ForegroundColor Green
