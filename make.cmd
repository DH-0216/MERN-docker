@echo off
setlocal
if exist "%LOCALAPPDATA%\make\bin\make.exe" (
    "%LOCALAPPDATA%\make\bin\make.exe" %*
) else (
    make.exe %*
)
