param(
  [string] $ManifestPath = "infra/docker/services.json",
  [string] $Dockerfile = "infra/docker/Dockerfile.node"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ManifestPath)) {
  throw "Container manifest not found at $ManifestPath."
}

if (-not (Test-Path $Dockerfile)) {
  throw "Dockerfile not found at $Dockerfile."
}

$rootPackage = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$requiredRootScripts = @("containers:build", "containers:check", "containers:tag", "containers:push")

foreach ($script in $requiredRootScripts) {
  if (-not ($rootPackage.scripts.PSObject.Properties.Name -contains $script)) {
    throw "Root package.json is missing script '$script'."
  }
}

$services = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$seenNames = New-Object System.Collections.Generic.HashSet[string]

foreach ($service in $services) {
  if (-not $seenNames.Add([string] $service.name)) {
    throw "Duplicate container name '$($service.name)' in $ManifestPath."
  }

  if (-not (Test-Path $service.packagePath)) {
    throw "Package path '$($service.packagePath)' does not exist for $($service.name)."
  }

  $packageJsonPath = Join-Path $service.packagePath "package.json"
  if (-not (Test-Path $packageJsonPath)) {
    throw "Missing package.json at $packageJsonPath."
  }

  $packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json

  foreach ($script in @("build", "start")) {
    if (-not ($packageJson.scripts.PSObject.Properties.Name -contains $script)) {
      throw "$($packageJson.name) is missing script '$script'."
    }
  }

  if ($packageJson.main -ne "dist/server.js") {
    throw "$($packageJson.name) must keep main='dist/server.js' for the shared runtime Dockerfile."
  }
}

Write-Host "Container foundation verified: shared Dockerfile, manifest and start scripts are present."
