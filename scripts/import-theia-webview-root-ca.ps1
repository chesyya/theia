param(
    [Parameter(Mandatory = $true)]
    [string]$CertificatePath
)

$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
    Write-Error 'Please rerun this script in an elevated PowerShell window.'
}

if (-not (Test-Path -LiteralPath $CertificatePath)) {
    Write-Error "Certificate file not found: $CertificatePath"
}

$resolvedCertificatePath = (Resolve-Path -LiteralPath $CertificatePath).Path
$certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($resolvedCertificatePath)

if (-not $certificate.Subject) {
    Write-Error "Failed to load certificate from: $resolvedCertificatePath"
}

Import-Certificate -FilePath $resolvedCertificatePath -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null

Write-Host ''
Write-Host "Imported certificate subject: $($certificate.Subject)"
Write-Host 'Installed Theia webview root certificate to LocalMachine\Root.'
Write-Host 'Please fully restart your browser before reopening Theia.'
