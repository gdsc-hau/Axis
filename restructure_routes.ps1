$ErrorActionPreference = "Stop"

# GDG-ID Restructure
$gdgIdPath = "c:\Users\LENOVO\Desktop\KCV\KIRK FILES\GDG\Axis\apps\gdg-id\src\app"

# Deletions for gdg-id
Write-Host "Deleting extraneous gdg-id folders..."
if (Test-Path "$gdgIdPath\(auth)") { Remove-Item -Recurse -Force "$gdgIdPath\(auth)" }
if (Test-Path "$gdgIdPath\(member)") { Remove-Item -Recurse -Force "$gdgIdPath\(member)" }
if (Test-Path "$gdgIdPath\(public)\coming-soon") { Remove-Item -Recurse -Force "$gdgIdPath\(public)\coming-soon" }
if (Test-Path "$gdgIdPath\(public)\faq") { Remove-Item -Recurse -Force "$gdgIdPath\(public)\faq" }

# Creations for gdg-id
Write-Host "Creating new gdg-id folders..."
$gdgIdNewDirs = @(
    "$gdgIdPath\(public)\scan",
    "$gdgIdPath\(public)\id\[memberId]"
)

foreach ($dir in $gdgIdNewDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $pagePath = Join-Path $dir "page.tsx"
    if (!(Test-Path $pagePath)) {
        $compName = ($dir -replace '.*\\([^\\]+)$', '$1').Replace("[", "").Replace("]", "")
        $content = "export default function $([char]::ToUpper($compName[0]))$($compName.Substring(1))Page() {`n  return (`n    <div className=`"flex flex-col items-center justify-center min-h-screen p-8`">`n      <h1 className=`"text-3xl font-bold`">$([char]::ToUpper($compName[0]))$($compName.Substring(1))</h1>`n    </div>`n  );`n}"
        Set-Content -LiteralPath $pagePath -Value $content
    }
}

# GDG-HUB Restructure
$gdgHubPath = "c:\Users\LENOVO\Desktop\KCV\KIRK FILES\GDG\Axis\apps\gdg-hub\app"

# Deletions for gdg-hub
Write-Host "Deleting extraneous gdg-hub folders..."
# public
if (Test-Path "$gdgHubPath\(public)\projects") { Remove-Item -Recurse -Force "$gdgHubPath\(public)\projects" }
if (Test-Path "$gdgHubPath\(public)\members") { Remove-Item -Recurse -Force "$gdgHubPath\(public)\members" }
# auth
if (Test-Path "$gdgHubPath\(auth)\sign-in") { Remove-Item -Recurse -Force "$gdgHubPath\(auth)\sign-in" }
if (Test-Path "$gdgHubPath\(auth)\sign-out") { Remove-Item -Recurse -Force "$gdgHubPath\(auth)\sign-out" }
if (Test-Path "$gdgHubPath\(auth)\callback") { Remove-Item -Recurse -Force "$gdgHubPath\(auth)\callback" }
# member
if (Test-Path "$gdgHubPath\(member)\certificates") { Remove-Item -Recurse -Force "$gdgHubPath\(member)\certificates" }
if (Test-Path "$gdgHubPath\(member)\portfolio") { Remove-Item -Recurse -Force "$gdgHubPath\(member)\portfolio" }
# admin
if (Test-Path "$gdgHubPath\(admin)\badges") { Remove-Item -Recurse -Force "$gdgHubPath\(admin)\badges" }
if (Test-Path "$gdgHubPath\(admin)\certificates") { Remove-Item -Recurse -Force "$gdgHubPath\(admin)\certificates" }
if (Test-Path "$gdgHubPath\(admin)\points") { Remove-Item -Recurse -Force "$gdgHubPath\(admin)\points" }
if (Test-Path "$gdgHubPath\(admin)\redemptions") { Remove-Item -Recurse -Force "$gdgHubPath\(admin)\redemptions" }

# Creations for gdg-hub
Write-Host "Creating new gdg-hub folders..."
$gdgHubNewDirs = @(
    "$gdgHubPath\(public)\community",
    "$gdgHubPath\(public)\articles",
    "$gdgHubPath\(public)\merch",
    "$gdgHubPath\(public)\products",
    "$gdgHubPath\(public)\contact",
    "$gdgHubPath\(public)\faq",
    "$gdgHubPath\(auth)\login",
    "$gdgHubPath\(auth)\signup",
    "$gdgHubPath\(auth)\verify",
    "$gdgHubPath\(member)\profile",
    "$gdgHubPath\(member)\wallet",
    "$gdgHubPath\(member)\notifications",
    "$gdgHubPath\(admin)\gyrocoins",
    "$gdgHubPath\(admin)\rewards",
    "$gdgHubPath\(admin)\articles",
    "$gdgHubPath\(admin)\products",
    "$gdgHubPath\(admin)\reports"
)

foreach ($dir in $gdgHubNewDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $pagePath = Join-Path $dir "page.tsx"
    if (!(Test-Path $pagePath)) {
        $compName = ($dir -replace '.*\\([^\\]+)$', '$1')
        $compNameFormatted = ""
        foreach ($part in $compName.Split('-')) {
            $compNameFormatted += $([char]::ToUpper($part[0])) + $part.Substring(1)
        }
        $content = "export default function $($compNameFormatted)Page() {`n  return (`n    <div className=`"flex flex-col items-center justify-center min-h-screen p-8`">`n      <h1 className=`"text-3xl font-bold`">$($compNameFormatted)</h1>`n    </div>`n  );`n}"
        Set-Content -LiteralPath $pagePath -Value $content
    }
}

Write-Host "Done restructuring."
