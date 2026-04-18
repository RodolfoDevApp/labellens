Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location -Path "$env:USERPROFILE\Desktop\repos"

$RepoRoot   = "$env:USERPROFILE\Desktop\repos\LabelLens"
$RepoName   = Split-Path -Path $RepoRoot -Leaf
$ExportRoot = "$env:USERPROFILE\Desktop\repos\_exports"
$Stamp      = Get-Date -Format "yyyyMMdd_HHmmss"
$StageDir   = Join-Path $ExportRoot "${RepoName}_stage_$Stamp"
$ZipPath    = Join-Path $ExportRoot "${RepoName}_$Stamp.zip"

$ExcludedDirs = @(
    "$RepoRoot\.git",
    "$RepoRoot\.vs",
    "$RepoRoot\.idea",
    "$RepoRoot\.vscode",

    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    "coverage",
    ".nyc_output",

    ".turbo",
    ".cache",
    ".parcel-cache",
    ".sass-cache",
    ".eslintcache",

    "cdk.out",
    ".aws-sam",
    ".serverless",
    ".localstack",

    "TestResults",
    "playwright-report",
    "test-results",

    "tmp",
    "temp"
)

$ExcludedFiles = @(
    ".env",
    ".env.*",
    "*.log",
    "*.tmp",
    "*.temp",
    "*.zip",
    "*.7z",
    "*.rar",
    "*.tar",
    "*.gz",
    "*.DS_Store",
    "Thumbs.db"
)

New-Item -ItemType Directory -Force -Path $ExportRoot | Out-Null

if (Test-Path $StageDir) {
    Remove-Item -Recurse -Force $StageDir
}

New-Item -ItemType Directory -Force -Path $StageDir | Out-Null

$RoboArgs = @(
    $RepoRoot,
    $StageDir,
    "/E",
    "/R:1",
    "/W:1",
    "/XD"
) + $ExcludedDirs + @(
    "/XF"
) + $ExcludedFiles

& robocopy @RoboArgs | Out-Host

if ($LASTEXITCODE -ge 8) {
    throw "robocopy falló con código $LASTEXITCODE"
}

if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

Compress-Archive -Path "$StageDir\*" -DestinationPath $ZipPath -CompressionLevel Optimal

Get-Item $ZipPath | Select-Object FullName, Length

Remove-Item -Recurse -Force $StageDir
