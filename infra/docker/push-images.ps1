param(
  [Parameter(Mandatory = $true)][string] $AccountId,
  [string] $Region = "us-east-1",
  [string] $Environment = "dev",
  [string] $RemoteTag = "latest",
  [string] $ManifestPath = "infra/docker/services.json"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found in PATH. Install Docker Desktop or make sure docker is available."
}

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found in PATH. Install AWS CLI v2 or make sure aws is available."
}

if (-not (Test-Path $ManifestPath)) {
  throw "Container manifest not found at $ManifestPath."
}

$services = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "Logging Docker into ECR registry $registry..."
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry

if ($LASTEXITCODE -ne 0) {
  throw "ECR Docker login failed. Check AWS credentials, account id and region."
}

foreach ($service in $services) {
  $remoteImage = "$registry/labellens-$Environment/$($service.name):$RemoteTag"

  Write-Host "Pushing $remoteImage"
  docker push $remoteImage

  if ($LASTEXITCODE -ne 0) {
    throw "Docker push failed for $($service.name)."
  }
}

Write-Host "Images pushed to ECR registry $registry."
