@echo off
setlocal enabledelayedexpansion

set "startIndex=0"
set "endIndex=18"
set "file=C:\Users\rayte\Downloads\workflow_api_apisr.json"

for /L %%i in (%startIndex%,1,%endIndex%) do (
    echo Running LoadImageIndex %%i
    yarn ts-node .\index.ts "%file%" --LoadImageIndex %%i
)

endlocal
pause