#!/bin/bash

echo "========================================"
echo "  ESP Web Flasher - Local Test Server"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found!"
    echo "Please install Python 3.x"
    exit 1
fi

# Change to web directory
cd "$(dirname "$0")"

echo "[INFO] Starting web server at http://localhost:8000"
echo "[INFO] Press Ctrl+C to stop the server"
echo ""
echo "Open your browser and navigate to:"
echo "   http://localhost:8000"
echo ""

# Start Python HTTP server
python3 -m http.server 8000
