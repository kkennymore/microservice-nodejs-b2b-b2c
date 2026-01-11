#!/usr/bin/env bash
#!/bin/bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.env"
sync_data_to_server() {
  local server_dir="${1:-"$SERVER_ROOT_DIR"}"

  if [[ -z "$SERVER_IP" ]]; then
    echo "❌ SERVER_IP is not set. Please export SERVER_IP=<your_server_ip>"
    return 1
  fi

  echo "🚀 Syncing local files to root@${SERVER_IP}:${server_dir} ..."
  rsync -avz --exclude-from='./scripts/.rsync-exclude' . "root@${SERVER_IP}:${server_dir}"

  echo "✅ Sync complete!"
}
sync_data_to_server