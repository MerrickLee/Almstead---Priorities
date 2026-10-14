#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export SUPABASE_TELEMETRY_DISABLED=1

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    docker-ce=5:28.5.2-1~ubuntu.24.04~noble \
    docker-ce-cli=5:28.5.2-1~ubuntu.24.04~noble \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    fuse-overlayfs \
    iptables
fi

sudo mkdir -p /etc/docker
if ! sudo test -f /etc/docker/daemon.json; then
  printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' | sudo tee /etc/docker/daemon.json >/dev/null
fi
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
sudo groupadd -f docker
sudo usermod -aG docker ubuntu

if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version 2>/dev/null | head -n 1)" != "2.121.0" ]]; then
  curl --retry 3 --retry-delay 5 -fsSL -o /tmp/supabase.deb "https://github.com/supabase/cli/releases/download/v2.121.0/supabase_2.121.0_linux_amd64.deb"
  sudo dpkg -i /tmp/supabase.deb
fi

cd /workspace
npm ci

if [[ ! -f supabase/config.toml ]]; then
  supabase init
fi
