@echo off
chcp 65001 >nul
REM ============================================
REM  切換到 Linfaya 帳號 (alvanchao)
REM ============================================

echo.
echo ========================================
echo   準備切換到 alvanchao 帳號
echo   (用於 Linfaya 專案)
echo ========================================
echo.

echo [1/3] 清除 Windows 認證管理員中的 GitHub 認證...
cmdkey /delete:git:https://github.com >nul 2>&1
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
cmdkey /delete:LegacyGeneric:target=https://api.github.com/alvanchao >nul 2>&1
cmdkey /delete:LegacyGeneric:target=https://api.github.com/alvanchao-cmyk >nul 2>&1
echo      認證已清除

echo.
echo [2/3] 設定 git 使用者為 alvanchao...
git config --global user.name "alvanchao"
git config --global user.email "alvanchao@users.noreply.github.com"
echo      git 使用者已設定

echo.
echo [3/3] 完成！
echo.
echo ========================================
echo   下次 git push 時會跳登入視窗
echo   請務必用 alvanchao 帳號登入！
echo ========================================
echo.
echo  小提醒:
echo  - 推 Linfaya 之前，瀏覽器的 GitHub
echo    要先確認登入 alvanchao 帳號
echo  - 如果跳出選擇授權的瀏覽器頁面，
echo    右上角頭像必須是 alvanchao (不是 cmyk)
echo.
pause
