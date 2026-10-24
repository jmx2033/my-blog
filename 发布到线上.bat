@echo off
chcp 65001 >nul
cd /d D:\Hugo-blog

set "SITE=https://shouye-blog.pages.dev"
set "PROJ=shouye-blog"
set "NODE=C:\Users\MQ223\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"
set "WRANGLER=C:\Users\MQ223\.workbuddy\binaries\node\workspace\node_modules\wrangler\bin\wrangler.js"

echo.
echo ================================
echo   发布 守叶的博客 到线上
echo ================================
echo.

echo [1/2] 构建站点...
"C:\Hugo\bin\hugo.exe" --cleanDestinationDir --baseURL "%SITE%/"
if errorlevel 1 goto fail

echo.
echo [2/2] 上传到 Cloudflare Pages...
"%NODE%" "%WRANGLER%" pages deploy public --project-name=%PROJ% --branch=main
if errorlevel 1 goto fail

echo.
echo ================================
echo   发布成功：%SITE%
echo ================================
echo.
pause
exit /b 0

:fail
echo.
echo 出错了。把上面这段报错发给 AI 看。
echo.
pause
exit /b 1
