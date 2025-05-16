#!/bin/bash

set -e

REPO="lspecian/maas-mcp-server"
VERSION="${1:-v1.1.1}" # default to latest known good release

detect_platform() {
  OS=$(uname | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) ARCH="amd64" ;;
    aarch64 | arm64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
  esac
  echo "${OS}-${ARCH}"
}

PLATFORM=$(detect_platform)
BINARY="maas-mcp-server-${PLATFORM}"

echo "Downloading maas-mcp-server $VERSION for $PLATFORM..."

URL="https://github.com/${REPO}/releases/download/${VERSION}/${BINARY}"

curl -L -o maas-mcp-server "$URL"
chmod +x maas-mcp-server
sudo mv maas-mcp-server /usr/local/bin/

echo "✅ Installed successfully as 'maas-mcp-server'"
echo "� Run it with:  maas-mcp-server"
