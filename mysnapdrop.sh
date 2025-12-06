#!/usr/bin/env bash

# Simple manager script for MySnapDrop.
# Usage:
#   ./mysnapdrop.sh start-server
#   ./mysnapdrop.sh stop-server
#   ./mysnapdrop.sh start-client
#   ./mysnapdrop.sh stop-client
#   ./mysnapdrop.sh start-all

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVER_PID_FILE="$ROOT_DIR/.server.pid"
CLIENT_PID_FILE="$ROOT_DIR/.client.pid"

start_server() {
  if [ -f "$SERVER_PID_FILE" ]; then
    local existing_pid
    existing_pid="$(cat "$SERVER_PID_FILE" 2>/dev/null || echo "")"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "Server already running with PID $existing_pid"
      return 0
    fi
  fi

  cd "$ROOT_DIR/server" || exit 1
  node index.js &
  local pid=$!
  echo "$pid" > "$SERVER_PID_FILE"
  cd "$ROOT_DIR" || exit 1
  echo "Server started with PID $pid"
}

stop_server() {
  if [ ! -f "$SERVER_PID_FILE" ]; then
    echo "No server PID file found (.server.pid)."
    return 0
  fi

  local pid
  pid="$(cat "$SERVER_PID_FILE" 2>/dev/null || echo "")"
  if [ -z "$pid" ]; then
    echo "Server PID file is empty; removing."
    rm -f "$SERVER_PID_FILE"
    return 0
  fi

  if kill "$pid" 2>/dev/null; then
    echo "Stopped server process with PID $pid"
  else
    echo "No running server process found for PID $pid (already stopped?)."
  fi
  rm -f "$SERVER_PID_FILE"
}

start_client() {
  if [ -f "$CLIENT_PID_FILE" ]; then
    local existing_pid
    existing_pid="$(cat "$CLIENT_PID_FILE" 2>/dev/null || echo "")"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "Client already running with PID $existing_pid"
      return 0
    fi
  fi

  cd "$ROOT_DIR/client" || exit 1
  npm run dev &
  local pid=$!
  echo "$pid" > "$CLIENT_PID_FILE"
  cd "$ROOT_DIR" || exit 1
  echo "Client (Vite dev server) started with PID $pid"
}

stop_client() {
  if [ ! -f "$CLIENT_PID_FILE" ]; then
    echo "No client PID file found (.client.pid)."
    return 0
  fi

  local pid
  pid="$(cat "$CLIENT_PID_FILE" 2>/dev/null || echo "")"
  if [ -z "$pid" ]; then
    echo "Client PID file is empty; removing."
    rm -f "$CLIENT_PID_FILE"
    return 0
  fi

  if kill "$pid" 2>/dev/null; then
    echo "Stopped client process with PID $pid"
  else
    echo "No running client process found for PID $pid (already stopped?)."
  fi
  rm -f "$CLIENT_PID_FILE"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <command>

Commands:
  start-server   Start the Express server (server/index.js)
  stop-server    Stop the Express server (using .server.pid)
  start-client   Start the React/Vite client (client/)
  stop-client    Stop the React/Vite client (using .client.pid)
  start-all      Start both server and client
EOF
}

case "$1" in
  start-server)
    start_server
    ;;
  stop-server)
    stop_server
    ;;
  start-client)
    start_client
    ;;
  stop-client)
    stop_client
    ;;
  start-all)
    start_server
    start_client
    ;;
  *)
    usage
    exit 1
    ;;
esac
