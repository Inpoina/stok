# === SETUP PATH ===
$folderPath = "C:\kampret\"
$dataFiles = Get-ChildItem -Path $folderPath -File

$tail = @()

# === Ambil 415 karakter terakhir dari tiap file ===
foreach ($file in $dataFiles) {
    $content = Get-Content $file.FullName -Raw
    $length = $content.Length
    if ($length -gt 415) {
        $tail += $content.Substring($length - 415)
    } else {
        $tail += $content
    }
}

# === Regex: Ambil nilai dari "SecaraTunai" ===
$matches = $tail | Select-String -Pattern 'SecaraTunai"?:["]?(\d+(?:\.\d+)?)' -AllMatches |
    ForEach-Object { $_.Matches.Groups[1].Value }

# === Hitung total ===
$total = 0
foreach ($num in $matches) {
    $total += [double]$num
}

# Format total (bulatkan)
$formattedTotal = [math]::Round($total)
$strukCount = $matches.Count

# Format data ke bentuk: 102700n5
$dataToEncrypt = "$formattedTotal" + "n" + "$strukCount"

# === INPUT PASSWORD TANPA TAMPIL ===
$securePass = Read-Host "p" -AsSecureString
$passUnsecure = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
)

# === AES ENKRIPSI ===
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

# Simpan ke file
$base64 | Set-Content "$folderPath\final.enc"

exit
