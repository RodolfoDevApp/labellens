$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

function Assert-Command {
  param([Parameter(Mandatory = $true)][string] $Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found in PATH."
  }
}

function Get-ProfileArgs {
  param([string] $Profile = "")

  if ([string]::IsNullOrWhiteSpace($Profile)) {
    return @()
  }

  return @("--profile", $Profile)
}

function Get-ProfileScriptArgs {
  param([string] $Profile = "")

  if ([string]::IsNullOrWhiteSpace($Profile)) {
    return @()
  }

  return @("-Profile", $Profile)
}

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory = $true)][string] $FileName,
    [string[]] $Arguments = @()
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  try {
    $raw = & $FileName @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $output = ($raw | ForEach-Object { $_.ToString() } | Out-String).Trim()

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string] $FileName,
    [Parameter(Mandatory = $true)][string[]] $Arguments,
    [Parameter(Mandatory = $true)][string] $FailureMessage
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  try {
    & $FileName @Arguments
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -ne 0) {
    throw $FailureMessage
  }
}

function Resolve-AwsAccountId {
  param(
    [string] $Region = "us-east-1",
    [string] $Profile = "",
    [string] $ExpectedAccountId = ""
  )

  Assert-Command "aws"

  $profileArgs = Get-ProfileArgs -Profile $Profile
  $arguments = @(
    "sts",
    "get-caller-identity",
    "--region",
    $Region
  ) + $profileArgs + @(
    "--query",
    "Account",
    "--output",
    "text"
  )

  $result = Invoke-NativeCommand -FileName "aws" -Arguments $arguments
  $accountId = $result.Output.Trim()

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($accountId) -or $accountId -eq "None") {
    throw "Unable to resolve AWS account id.`n$result.Output"
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedAccountId) -and $ExpectedAccountId -ne $accountId) {
    throw "AWS credentials resolved account $accountId but expected $ExpectedAccountId."
  }

  return $accountId
}

function Get-StackName {
  param([Parameter(Mandatory = $true)][string] $Environment)

  return "LabelLens-$Environment"
}

function Get-ResourcePrefix {
  param([Parameter(Mandatory = $true)][string] $Environment)

  return "labellens-$Environment"
}

function Assert-DeploymentMode {
  param([Parameter(Mandatory = $true)][string] $DeploymentMode)

  if ($DeploymentMode -ne "bootstrap" -and $DeploymentMode -ne "release") {
    throw "DeploymentMode must be 'bootstrap' or 'release'."
  }
}
