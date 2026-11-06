@echo off
chcp 936 >nul
cd /d D:\Hugo-blog

set "SITE=https://shouye-blog.pages.dev"
set "PROJ=shouye-blog"
set "ACCOUNT=630bce62c4f787db1dd3d169a040fbf6"
set "HUGO=C:\Hugo\bin\hugo.exe"
set "NODE=C:\Users\MQ223\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"
set "WRANGLER=C:\Users\MQ223\.workbuddy\binaries\node\workspace\node_modules\wrangler\bin\wrangler.js"
set "TOKENFILE=deploy-token.txt"

echo.
echo ================================
echo    发布 守叶的博客 到线上
echo ================================
echo.

if not exist "%TOKENFILE%" goto notoken

set /p CFTOKEN=<%TOKENFILE%
if not defined CFTOKEN goto notoken
set "CLOUDFLARE_API_TOKEN=%CFTOKEN%"
set "CLOUDFLARE_ACCOUNT_ID=%ACCOUNT%"
set "WRANGLER_SEND_METRICS=false"

echo [1/3] 构建站点...
"%HUGO%" --cleanDestinationDir --noBuildLock --quiet
if errorlevel 1 goto fail

rem 构建产物自检：_headers 负责浏览器长缓存，缺了就等于白优化；robots 影响收录
if not exist "public\_headers" goto missing
if not exist "public/robots.txt" goto missing

echo [2/3] 检查有没有超过 25MB 的文件...
set "BIGFILE="
for /r "public" %%F in (*.*) do @if not "%%~zF"=="" if %%~zF GTR 26214400 set "BIGFILE=%%~nxF"
if defined BIGFILE goto toobig

echo [3/3] 上传到 Cloudflare Pages...
chcp 65001 >nul
"%NODE%" "%WRANGLER%" pages deploy public --project-name=%PROJ% --branch=main --commit-dirty=true
set "DEPLOY_RC=%ERRORLEVEL%"
chcp 936 >nul
if not "%DEPLOY_RC%"=="0" goto fail

echo.
echo ================================
echo    发布成功
echo    %SITE%
echo ================================
echo.
echo 提示：如果打开看到旧内容，按 Ctrl+F5 强制刷新。
echo.
pause
exit /b 0

:notoken
echo [错误] 找不到可用的 %TOKENFILE%
echo.
echo 这个文件里存的是 Cloudflare API 令牌，上传需要它。
echo 去 https://dash.cloudflare.com/profile/api-tokens 建一个：
echo   权限选 Account / Cloudflare Pages / Edit
echo 建好把令牌粘进 D:\Hugo-blog\%TOKENFILE% ，保存后重新双击本脚本。
echo.
pause
exit /b 1

:toobig
echo.
echo [错误] 下面这个文件超过了 Cloudflare 的 25MB 单文件上限：
echo   %BIGFILE%
echo.
echo 最常见的原因：public 里混进了自己打的压缩包（比如 blog.zip）。
echo 删掉它，或者把它移到项目根目录，然后重新双击本脚本。
echo.
pause
exit /b 1

:missing
echo.
echo [错误] 构建产物里缺少 _headers 或 robots.txt。
echo 这两个文件放在 static/ 目录下，Hugo 会原样复制进 public/。
echo 检查它们是否被误删或改名，再重新双击本脚本。
echo.
pause
exit /b 1

:fail
echo.
echo 出错了。把上面这段报错发给 AI 看。
echo.
echo 常见原因：
echo   1. 站点配置有语法错误（hugo.toml 缩进/引号）
echo   2. 文章 front matter 写坏了
echo   3. .hugo_build.lock 权限异常（本脚本已加 --noBuildLock 规避）
echo.
pause
exit /b 1
