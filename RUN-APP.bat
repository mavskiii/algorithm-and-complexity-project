@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo First run: installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
echo Building the learning workspace...
call npm run build
if errorlevel 1 (
  echo The app could not build. See the error above.
  pause
  exit /b 1
)
echo Open http://localhost:3001/ in your browser.
echo Keep this window open while using the website and AI tutor.
call npm start
pause

