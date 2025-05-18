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
BINARY="maas-mcp-server_${VERSION}_${PLATFORM//-/_}"

echo "Downloading maas-mcp-server $VERSION for $PLATFORM..."

# The release assets are likely packaged as tar.gz or zip
if [[ "$PLATFORM" == *"windows"* ]]; then
  ARCHIVE="${BINARY}.zip"
  EXTRACT_CMD="unzip"
else
  ARCHIVE="${BINARY}.tar.gz"
  EXTRACT_CMD="tar -xzf"
fi

URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARCHIVE}"

# Create a temporary directory
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Download the archive
echo "Downloading from: $URL"
if ! curl -L -o "$ARCHIVE" "$URL"; then
  echo "❌ Failed to download the binary. Please check the URL and try again."
  exit 1
fi

# Extract the binary
echo "Extracting binary..."
$EXTRACT_CMD "$ARCHIVE"

# Make it executable and move to /usr/local/bin
chmod +x "$BINARY"
sudo mv "$BINARY" /usr/local/bin/maas-mcp-server

# Clean up
cd - > /dev/null
rm -rf "$TMP_DIR"

echo "✅ Installed successfully as 'maas-mcp-server'"
echo "� Run it with:  maas-mcp-server"
