# PowerShell Deployment Script
# Usage: .\deploy-to-server.ps1 -ServerUser youruser -ServerHost server-ip

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerUser,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerHost,
    
    [string]$ServerPath = "/opt/gymenace"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Gymenace to $ServerUser@$ServerHost" -ForegroundColor Cyan
Write-Host ""

# Check if in project directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project directory" -ForegroundColor Red
    exit 1
}

# Create temp directory
$tempDir = Join-Path $env:TEMP "gymenace-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📦 Preparing deployment package..." -ForegroundColor Cyan

# Files to copy
$filesToCopy = @(
    "src",
    "public",
    "prisma",
    "config",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "components.json",
    "prisma.config.ts"
)

foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        Copy-Item -Path $item -Destination $tempDir -Recurse -Force
        Write-Host "  ✓ $item" -ForegroundColor Gray
    }
}

# Create PM2 ecosystem config
$pm2Config = @"
module.exports = {
  apps: [{
    name: 'gymenace',
    script: 'npm',
    args: 'start',
    cwd: '$ServerPath',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '$ServerPath/logs/error.log',
    out_file: '$ServerPath/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
"@
$pm2Config | Out-File -FilePath "$tempDir\ecosystem.config.js" -Encoding UTF8

Write-Host "✓ Created PM2 config" -ForegroundColor Green
Write-Host ""

# Upload to server
Write-Host "📤 Uploading to server..." -ForegroundColor Cyan

# Create directory on server
ssh "${ServerUser}@${ServerHost}" "mkdir -p $ServerPath"

# Upload files
Write-Host "  Uploading files (this may take a minute)..." -ForegroundColor Gray
scp -r "$tempDir\*" "${ServerUser}@${ServerHost}:${ServerPath}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Files uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    Remove-Item $tempDir -Recurse -Force
    exit 1
}

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✓ Deployment package uploaded!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps on your server:" -ForegroundColor Yellow
Write-Host ""
Write-Host "SSH into your server:" -ForegroundColor White
Write-Host "  ssh ${ServerUser}@${ServerHost}" -ForegroundColor Gray
Write-Host ""
Write-Host "Then run these commands:" -ForegroundColor White
Write-Host "  cd $ServerPath" -ForegroundColor Gray
Write-Host "  cp .env.production .env" -ForegroundColor Gray
Write-Host "  nano .env  # Update AUTH_URL with your domain" -ForegroundColor Gray
Write-Host "  npm install --omit=dev" -ForegroundColor Gray
Write-Host "  npm run build" -ForegroundColor Gray
Write-Host "  npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "  npm run db:seed" -ForegroundColor Gray
Write-Host "  mkdir -p logs" -ForegroundColor Gray
Write-Host "  pm2 start ecosystem.config.js" -ForegroundColor Gray
Write-Host "  pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitor your app:" -ForegroundColor White
Write-Host "  pm2 status" -ForegroundColor Gray
Write-Host "  pm2 logs gymenace" -ForegroundColor Gray
Write-Host ""