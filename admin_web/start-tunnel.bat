@echo off
echo Starting ngrok tunnel for backend...
echo Backend will be accessible via HTTPS tunnel
echo.
ngrok http 3001
