@echo off
REM =============================================================================
REM  compile_fps_counter.bat
REM  Builds fps_counter.dll from fps_counter.cpp using MSVC (cl.exe).
REM
REM  Supports Visual Studio 2022 (17) and 2026 (18) installations,
REM  both Professional and Community editions.
REM
REM  Usage: Run this script from the Gaming\backend\ directory.
REM =============================================================================

setlocal EnableDelayedExpansion

echo ============================================================
echo  Aero AI -- FPS Counter DLL Build Script
echo ============================================================

REM ── Locate vcvars64.bat ─────────────────────────────────────────────────────
set "VCVARS="

REM VS 2026 Professional (version 18)
if exist "C:\Program Files\Microsoft Visual Studio\18\Professional\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Professional\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2026 Professional
    goto :found_vs
)

REM VS 2026 Community (version 18)
if exist "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2026 Community
    goto :found_vs
)

REM VS 2026 Enterprise (version 18)
if exist "C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2026 Enterprise
    goto :found_vs
)

REM VS 2022 Professional (version 17)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2022 Professional
    goto :found_vs
)

REM VS 2022 Community (version 17)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2022 Community
    goto :found_vs
)

REM VS 2022 Enterprise (version 17)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2022 Enterprise
    goto :found_vs
)

REM VS 2022 Build Tools (version 17)
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
    set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
    echo [INFO] Found VS 2022 Build Tools
    goto :found_vs
)

echo [ERROR] Could not find a supported Visual Studio installation (2022 or 2026).
echo         Please install "Desktop development with C++" workload.
exit /b 1

:found_vs
echo [INFO] Using: %VCVARS%
echo.

REM ── Check source file ───────────────────────────────────────────────────────
if not exist "fps_counter.cpp" (
    echo [ERROR] fps_counter.cpp not found in current directory.
    echo         Run this script from Gaming\backend\fps_counter\
    exit /b 1
)

REM ── Initialize MSVC environment ─────────────────────────────────────────────
call "%VCVARS%" > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to initialize MSVC environment.
    exit /b 1
)

REM ── Compile ─────────────────────────────────────────────────────────────────
echo [BUILD] Compiling fps_counter.cpp ...
echo.

cl.exe /nologo /O2 /GL /Gy /EHsc /MD /LD ^
    /DWIN32 /D_WINDOWS /DNDEBUG /D_USRDLL /DFPS_COUNTER_EXPORTS ^
    /W3 /WX- ^
    /Fo"fps_counter.obj" ^
    /Fe"fps_counter.dll" ^
    fps_counter.cpp ^
    /link /DLL /LTCG /OPT:REF /OPT:ICF ^
    kernel32.lib

if errorlevel 1 (
    echo.
    echo [ERROR] Compilation FAILED. Check the output above for errors.
    exit /b 1
)

REM ── Verify output ────────────────────────────────────────────────────────────
if not exist "fps_counter.dll" (
    echo [ERROR] fps_counter.dll was not produced. Compilation may have failed silently.
    exit /b 1
)

REM ── Clean up intermediate files ──────────────────────────────────────────────
del /f /q fps_counter.obj 2>nul
del /f /q fps_counter.lib 2>nul
del /f /q fps_counter.exp 2>nul

echo.
echo ============================================================
echo  SUCCESS: fps_counter.dll built successfully!
echo ============================================================
echo.
echo  Export verification:
dumpbin /exports fps_counter.dll 2>nul | findstr /i "SetTargetPID UpdateFPSCounter GetAverageFPS GetMinAvgFPS GetMaxAvgFPS GetMinFPS GetMaxFPS GetOnePercentLow GetFrameCount ResetFPSCounter"
echo.
echo  Place fps_counter.dll in Gaming\backend\fps_counter\ (already there).
echo  The Python backend will auto-detect it on next startup.
echo ============================================================

endlocal
exit /b 0
