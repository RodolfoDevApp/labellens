param([string] $PackageJsonPath = "package.json")
$ErrorActionPreference = "Stop"
$requiredFiles = @("infra/aws/aws-deploy-common.ps1","infra/aws/check-aws-prerequisites.ps1","infra/aws/bootstrap-cdk-environment.ps1","infra/aws/deploy-infra-bootstrap.ps1","infra/aws/diff-cdk.ps1","infra/aws/deploy-cdk.ps1","infra/aws/first-deploy.ps1","infra/aws/smoke-gateway.ps1","infra/aws/README.md","infra/cdk/src/bin/label-lens-cdk.ts","infra/cdk/src/config/label-lens-aws-config.ts")
foreach ($file in $requiredFiles) { if (-not (Test-Path $file)) { throw "Missing deploy readiness file: $file" } }
$rootPackage = Get-Content -Raw -Path $PackageJsonPath | ConvertFrom-Json
foreach ($script in @("aws:deploy:check","aws:prereqs","aws:cdk:bootstrap","aws:infra:bootstrap","aws:diff","aws:deploy","aws:first-deploy","aws:smoke")) { if (-not ($rootPackage.scripts.PSObject.Properties.Name -contains $script)) { throw "Root package.json is missing script '$script'." } }
Write-Host "AWS deploy readiness foundation verified. No AWS account was required for this check."
