$projectDir = "F:\TOOLS\ObwilerCardMaker\0.8.5"
Set-Location $projectDir
$process = Start-Process -FilePath "npm" -ArgumentList "run", "tauri", "dev" -WindowStyle Hidden -PassThru
