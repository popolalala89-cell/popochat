#!/data/data/com.termux/files/usr/bin/bash
# Popochat FCM Server — Start script untuk Termux
# Jalankan: bash server/start-fcm.sh

DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$DIR/server/server.pid"

echo "╔══════════════════════════════════════╗"
echo "║   Popochat FCM — Start di Termux     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Cek apakah sudah jalan
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚠️  Server sudah jalan (PID: $OLD_PID)"
    echo "   Restart dulu? (y/n)"
    read -r ans
    if [ "$ans" != "y" ]; then
      exit 0
    fi
    echo "   Stopping old server..."
    kill "$OLD_PID" 2>/dev/null
    sleep 1
  fi
fi

echo "🚀 Menjalankan FCM server..."
echo "   (Tekan Ctrl+C untuk stop)"
echo ""

cd "$DIR/server" && node index.js
