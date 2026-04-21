param(
  [string] $Image = "",
  [string] $Tag = "local",
  [string] $RepositoryPrefix = "labellens",
  [string] $ManifestPath = "infra/docker/services.json",
  [string] $Dockerfile = "infra/docker/Dockerfile.node"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found in PATH. Install Docker Desktop or make sure docker is available."
}

if (-not (Test-Path $ManifestPath)) {
  throw "Container manifest not found at $ManifestPath."
}

if (-not (Test-Path $Dockerfile)) {
  throw "Dockerfile not found at $Dockerfile."
}

$services = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json

if (-not [string]::IsNullOrWhiteSpace($Image)) {
  $services = @($services | Where-Object { $_.name -eq $Image -or $_.workspace -eq $Image })

  if ($services.Count -eq 0) {
    throw "Image '$Image' is not in $ManifestPath."
  }
}

foreach ($service in $services) {
  $port = if ($service.PSObject.Properties.Name -contains "port") { [string] $service.port } else { "0" }
  $tagName = "$RepositoryPrefix/$($service.name):$Tag"

  Write-Host "Building $tagName from workspace $($service.workspace)..."

  docker build `
    --file $Dockerfile `
    --build-arg "WORKSPACE=$($service.workspace)" `
    --build-arg "PACKAGE_PATH=$($service.packagePath)" `
    --build-arg "SERVICE_NAME=$($service.name)" `
    --build-arg "SERVICE_PORT=$port" `
    --tag $tagName `
    .

  if ($LASTEXITCODE -ne 0) {
    throw "Docker build failed for $($service.name)."
  }
}

Write-Host "Container images built successfully."
