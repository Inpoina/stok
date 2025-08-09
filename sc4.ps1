
$folderPath = "C:\Users\kasir_induk\contanak\"
$dataFiles = Get-ChildItem -Path $folderPath -File

$tail = @()


foreach ($file in $dataFiles) {
    $content = Get-Content $file.FullName -Raw
    $length = $content.Length
    if ($length -gt 415) {
        $tail += $content.Substring($length - 415)
    } else {
        $tail += $content
    }
}


$matches = $tail | Select-String -Pattern 'SecaraTunai"?:["]?(\d+(?:\.\d+)?)' -AllMatches |
    ForEach-Object { $_.Matches.Groups[1].Value }

$total = 0
foreach ($num in $matches) {
    $total += [double]$num
}

$formattedTotal = [math]::Round($total)
$strukCount = $matches.Count

$dataToEncrypt = "$formattedTotal" + "n" + "$strukCount"

$securePass = Read-Host "p" -AsSecureString
$passUnsecure = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
)


$sha = [System.Security.Cryptography.SHA256]::Create()
$key = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($passUnsecure))
$iv = New-Object Byte[] 16  # 16 byte nol

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Key = $key
$aes.IV = $iv
$encryptor = $aes.CreateEncryptor()

$plainBytes = [Text.Encoding]::UTF8.GetBytes($dataToEncrypt)
$encryptedBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
$base64 = [Convert]::ToBase64String($encryptedBytes)

$base64 | Set-Content "$folderPath\final.enc"

exit
