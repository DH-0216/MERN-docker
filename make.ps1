[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MakeArgs
)

$makePath = "$env:LOCALAPPDATA\make\bin\make.exe"
if (Test-Path $makePath) {
    & $makePath $MakeArgs
} else {
    make.exe $MakeArgs
}
