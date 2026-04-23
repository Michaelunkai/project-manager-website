param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$RuntimePackage = "@libsql/linux-x64-gnu"
)

$ErrorActionPreference = "Stop"

$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$nodeModulesPath = Join-Path $projectPath "node_modules"
$libsqlPackagePath = Join-Path $nodeModulesPath "libsql\\package.json"

if (-not (Test-Path -LiteralPath $libsqlPackagePath)) {
  throw "Missing $libsqlPackagePath. Run npm install first."
}

$libsqlMetadata = Get-Content -LiteralPath $libsqlPackagePath -Raw | ConvertFrom-Json
$runtimeVersion = $libsqlMetadata.optionalDependencies.$RuntimePackage

if (-not $runtimeVersion) {
  throw "libsql does not declare an optional dependency for $RuntimePackage."
}

$targetPath = Join-Path $nodeModulesPath ($RuntimePackage -replace "/", "\")
$targetPackagePath = Join-Path $targetPath "package.json"

if (Test-Path -LiteralPath $targetPackagePath) {
  $existing = Get-Content -LiteralPath $targetPackagePath -Raw | ConvertFrom-Json
  if ($existing.name -eq $RuntimePackage -and $existing.version -eq $runtimeVersion) {
    Write-Output "Netlify runtime package already present: $RuntimePackage@$runtimeVersion"
    exit 0
  }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("netlify-runtime-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  Push-Location $tempRoot

  npm pack "$RuntimePackage@$runtimeVersion" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "npm pack failed for $RuntimePackage@$runtimeVersion"
  }

  $tarball = Get-ChildItem -LiteralPath $tempRoot -Filter "*.tgz" | Select-Object -First 1
  if (-not $tarball) {
    throw "Unable to locate the packed tarball for $RuntimePackage@$runtimeVersion"
  }

  tar.exe -xf $tarball.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "tar extraction failed for $($tarball.FullName)"
  }

  $unpackedPackagePath = Join-Path $tempRoot "package"
  if (-not (Test-Path -LiteralPath $unpackedPackagePath)) {
    throw "Expected unpacked package directory was not created."
  }

  if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Recurse -Force
  }

  New-Item -ItemType Directory -Path (Split-Path -Path $targetPath -Parent) -Force | Out-Null
  Move-Item -LiteralPath $unpackedPackagePath -Destination $targetPath

  Write-Output "Installed $RuntimePackage@$runtimeVersion into $targetPath"
} finally {
  Pop-Location

  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
