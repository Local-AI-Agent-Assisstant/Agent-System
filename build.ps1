# build.ps1
$ErrorActionPreference = "Stop"

Write-Host "--- Installing PyInstaller ---" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\MCP_server"
pip install pyinstaller

Write-Host "--- Building Python Backend ---" -ForegroundColor Cyan
# Build the single executable server.exe
# We exclude torchaudio because it crashes PyInstaller on Windows, and Whisper works fine without it.
python -m PyInstaller --onefile --clean --name server --exclude-module torchaudio server.py

Write-Host "--- Building React Frontend ---" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\AI_Chatbot"
npm install
npm run build

Write-Host "--- Packaging Desktop Application ---" -ForegroundColor Cyan
npm run electron:build

Write-Host "--- Build Complete! ---" -ForegroundColor Green
Write-Host "Check the AI_Chatbot\release folder for your Installer." -ForegroundColor Green
