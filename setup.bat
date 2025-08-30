@echo off
echo Starting backend server...
start cmd /k "cd backend && npm start"

echo Starting frontend server...
timeout /t 3
start cmd /k "cd frontend/rig-frontend && npm start"

echo Both servers are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3001
pause