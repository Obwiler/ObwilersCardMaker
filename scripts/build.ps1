<#
.SYNOPSIS
    ObwilerCardMaker 一键构建脚本
.DESCRIPTION
    自动检测环境 → 安装依赖 → 前端构建 → 后端编译 → 收集产物
.PARAMETER Target
    构建目标：exe (Windows 桌面端) / apk (Android) / both (两者)
    默认: both
.EXAMPLE
    .\scripts\build.ps1 -Target exe
    .\scripts\build.ps1 -Target both
.NOTES
    依赖: Rust 1.75+, Node.js 18+, pnpm
    Android 构建额外需要: JDK 17+, Android SDK, Android NDK
#>

param(
    [ValidateSet('exe', 'apk', 'both')]
    [string]$Target = 'both'
)

$ErrorActionPreference = 'Stop'
$BuildDir = Split-Path -Parent $PSScriptRoot
Set-Location $BuildDir

$Version = '1.0.0'
$OutputDir = Join-Path $BuildDir 'builds\1.0.0'
$StartTime = Get-Date

# ──────────────────────────────────────────────────
# 0. 初始化
# ──────────────────────────────────────────────────
Write-Host ''
Write-Host '══════════════════════════════════════' -ForegroundColor Cyan
Write-Host "  ObwilerCardMaker v$Version 构建" -ForegroundColor Cyan
Write-Host "  目标: $Target" -ForegroundColor Cyan
Write-Host "  开始: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
Write-Host '══════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# ──────────────────────────────────────────────────
# 1. 激活本地工具链
# ──────────────────────────────────────────────────
Write-Host '[1/7] 激活工具链...' -ForegroundColor Yellow

$ToolsRoot = 'E:\tools'
if (Test-Path $ToolsRoot) {
    $env:PATH = "$ToolsRoot\rust\bin;$ToolsRoot\node;$ToolsRoot\git\bin;$ToolsRoot\git\cmd;$ToolsRoot\git\mingw64\bin;$env:PATH"
    $env:CARGO_HOME = "$ToolsRoot\rust"
    $env:RUSTUP_HOME = "$ToolsRoot\rust"
}

# ──────────────────────────────────────────────────
# 2. 环境检测
# ──────────────────────────────────────────────────
Write-Host '[2/7] 环境检测...' -ForegroundColor Yellow

$EnvOk = $true
$ReportLines = @()

# Rust
try {
    $rustVer = rustc --version 2>&1
    $cargoVer = cargo --version 2>&1
    Write-Host "  [OK] Rust: $rustVer" -ForegroundColor Green
    $ReportLines += "Rust: $rustVer"
} catch {
    Write-Host "  [FAIL] Rust 未找到" -ForegroundColor Red
    $ReportLines += "Rust: MISSING"
    $EnvOk = $false
}

# Node.js
try {
    $nodeVer = node --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVer" -ForegroundColor Green
    $ReportLines += "Node.js: $nodeVer"
} catch {
    Write-Host "  [FAIL] Node.js 未找到" -ForegroundColor Red
    $ReportLines += "Node.js: MISSING"
    $EnvOk = $false
}

# pnpm
try {
    $pnpmVer = pnpm --version 2>&1
    Write-Host "  [OK] pnpm: $pnpmVer" -ForegroundColor Green
    $ReportLines += "pnpm: $pnpmVer"
} catch {
    Write-Host "  [FAIL] pnpm 未找到" -ForegroundColor Red
    $ReportLines += "pnpm: MISSING"
    $EnvOk = $false
}

# ── Android 特定检测 ──
$AndroidOk = $true
$hasJava = $false; $hasSdk = $false; $hasNdk = $false

if ($Target -eq 'apk' -or $Target -eq 'both') {
    try {
        $null = java -version 2>&1
        $hasJava = $true
        Write-Host "  [OK] JDK: 可用" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] JDK 未找到" -ForegroundColor DarkYellow
        $AndroidOk = $false
    }

    $sdkPath = $env:ANDROID_HOME
    if (-not $sdkPath) { $sdkPath = "$env:LOCALAPPDATA\Android\Sdk" }
    if (Test-Path $sdkPath) {
        $hasSdk = $true
        Write-Host "  [OK] Android SDK: $sdkPath" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Android SDK 未找到" -ForegroundColor DarkYellow
        $AndroidOk = $false
    }

    if ($hasSdk) {
        $ndkPath = Join-Path $sdkPath 'ndk'
        if (Test-Path $ndkPath) {
            $hasNdk = $true
            Write-Host "  [OK] Android NDK: 已安装" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Android NDK 未找到" -ForegroundColor DarkYellow
            $AndroidOk = $false
        }
    }

    if (-not $AndroidOk) {
        Write-Host ''
        Write-Host '  Android 环境不完整，将跳过 APK 构建' -ForegroundColor DarkYellow
        Write-Host '  需安装: JDK 17+, Android Studio (SDK + NDK)' -ForegroundColor DarkYellow
    }
}

if (-not $EnvOk) {
    Write-Host ''
    Write-Host 'FATAL: 基础环境不完整，无法继续。' -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────────
# 3. 安装前端依赖
# ──────────────────────────────────────────────────
Write-Host '[3/7] 安装前端依赖...' -ForegroundColor Yellow

if (-not (Test-Path 'node_modules')) {
    try {
        pnpm install 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
        Write-Host '  [OK] 依赖安装成功' -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host '  [SKIP] node_modules 已存在' -ForegroundColor Gray
}

# ──────────────────────────────────────────────────
# 4. 前端构建
# ──────────────────────────────────────────────────
Write-Host '[4/7] 前端构建 (pnpm build)...' -ForegroundColor Yellow

try {
    pnpm build 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "pnpm build 失败" }
    Write-Host '  [OK] 前端构建成功' -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────────
# 5. EXE 构建
# ──────────────────────────────────────────────────
if ($Target -eq 'exe' -or $Target -eq 'both') {
    Write-Host '[5/7] 构建 Windows EXE...' -ForegroundColor Yellow

    try {
        cargo build --release 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "cargo build --release 失败" }
        Write-Host '  [OK] Rust 编译成功' -ForegroundColor Green

        # 查找产物
        $ExeSource = Join-Path $BuildDir 'src-tauri\target\release\cardmaker.exe'
        if (Test-Path $ExeSource) {
            $ExeDest = Join-Path $OutputDir "ObwilerCardMaker_${Version}_x64.exe"
            Copy-Item $ExeSource $ExeDest -Force
            $ExeSize = (Get-Item $ExeDest).Length
            $ExeSizeMB = [math]::Round($ExeSize / 1MB, 2)
            Write-Host "  [OK] EXE 已复制: $ExeDest ($ExeSizeMB MB)" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] cardmaker.exe 未在预期位置找到" -ForegroundColor DarkYellow
            Write-Host "  预期: $ExeSource" -ForegroundColor DarkYellow
        }
    } catch {
        Write-Host "  [FAIL] EXE 构建失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host '[5/7] 跳过 EXE 构建 (目标: $Target)' -ForegroundColor Gray
}

# ──────────────────────────────────────────────────
# 6. APK 构建
# ──────────────────────────────────────────────────
if ($Target -eq 'apk' -or $Target -eq 'both') {
    Write-Host '[6/7] 构建 Android APK...' -ForegroundColor Yellow

    if (-not $AndroidOk) {
        Write-Host "  [SKIP] Android 环境不完整，跳过 APK 构建" -ForegroundColor DarkYellow
    } else {
        try {
            # 初始化 Android 项目（如果尚未初始化）
            $AndroidDir = Join-Path $BuildDir 'src-tauri\gen\android'
            if (-not (Test-Path $AndroidDir)) {
                Write-Host "  初始化 Android 项目..." -ForegroundColor Gray
                npx @tauri-apps/cli android init 2>&1 | Out-Host
            }

            npx @tauri-apps/cli android build 2>&1 | Out-Host
            if ($LASTEXITCODE -ne 0) { throw "cargo tauri android build 失败" }
            Write-Host '  [OK] APK 构建成功' -ForegroundColor Green

            # 复制 APK
            $ApkSource = Join-Path $BuildDir 'src-tauri\gen\android\app\build\outputs\apk\release\app-release.apk'
            if (Test-Path $ApkSource) {
                $ApkDest = Join-Path $OutputDir "ObwilerCardMaker_${Version}.apk"
                Copy-Item $ApkSource $ApkDest -Force
                $ApkSize = (Get-Item $ApkDest).Length
                $ApkSizeMB = [math]::Round($ApkSize / 1MB, 2)
                Write-Host "  [OK] APK 已复制: $ApkDest ($ApkSizeMB MB)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [FAIL] APK 构建失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host '[6/7] 跳过 APK 构建 (目标: $Target)' -ForegroundColor Gray
}

# ──────────────────────────────────────────────────
# 7. 构建摘要
# ──────────────────────────────────────────────────
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ''
Write-Host '══════════════════════════════════════' -ForegroundColor Cyan
Write-Host "  构建完成" -ForegroundColor Cyan
Write-Host "  耗时: $($Duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
Write-Host "  产物目录: $OutputDir" -ForegroundColor Cyan
Write-Host '══════════════════════════════════════' -ForegroundColor Cyan

if (Test-Path $OutputDir) {
    Write-Host ''
    Write-Host '产物列表:' -ForegroundColor White
    Get-ChildItem $OutputDir | ForEach-Object {
        $size = if ($_.Length -ge 1MB) { "$([math]::Round($_.Length/1MB, 2)) MB" } else { "$([math]::Round($_.Length/1KB, 1)) KB" }
        Write-Host "  $($_.Name)  [$size]" -ForegroundColor Green
    }
}

Write-Host ''
