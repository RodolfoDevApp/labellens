param(
  [Parameter(Mandatory = $true)][string] $AccountId,
  [string] $Region = "us-east-1",
  [string] $Environment = "dev",
  [string] $LocalTag = "local",
  [string] $RemoteTag = "latest",
  [string] $RepositoryPrefix = "labellens",
  [string] $ManifestPath = "infra/docker/services.json"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found in PATH. Install Docker Desktop or make sure docker is available."
}

if (-not (Test-Path $ManifestPath)) {
  throw "Container manifest not found at $ManifestPath."
}

$services = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"

foreach ($service in $services) {
  $localImage = "$RepositoryPrefix/$($service.name):$LocalTag"
  $remoteImage = "$registry/labellens-$Environment/$($service.name):$RemoteTag"

  Write-Host "Tagging $localImage -> $remoteImage"
  docker tag $localImage $remoteImage

  if ($LASTEXITCODE -ne 0) {
    throw "Docker tag failed for $($service.name). Build local images first."
  }
}

Write-Host "Images tagged for ECR registry $registry."
