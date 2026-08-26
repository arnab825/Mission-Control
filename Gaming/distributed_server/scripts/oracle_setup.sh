#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Mission Control — Oracle Cloud VM 1-Click Server Setup Script
# Ubuntu 24.04 LTS (ARM64 Ampere / x86_64)
# ══════════════════════════════════════════════════════════════════════════════
set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 Mission Control — Production Server Deployment on Oracle Cloud"
echo "════════════════════════════════════════════════════════════════"

# 1. Update system packages
echo "📦 Updating OS packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw htop ca-certificates gnupg lsb-release

# 2. Setup 4GB Swapfile for maximum RAM stability
if [ ! -f /swapfile ]; then
    echo "💾 Creating 4GB swapfile for database buffering..."
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
fi

# 3. Kernel Tuning for High Performance PostgreSQL & Redis
echo "⚡ Tuning Linux Kernel parameters..."
cat <<EOF | sudo tee -a /etc/sysctl.d/99-mission-control.conf
vm.max_map_count=262144
fs.file-max=2097152
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
EOF
sudo sysctl --system

# 4. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
fi

# 5. Configure Firewall (UFW and Oracle iptables)
echo "🛡️ Configuring Firewall Ports (8800, 5432, 80, 443)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8800/tcp comment 'Mission Control API Gateway'
sudo ufw allow 5432/tcp comment 'PostgreSQL 16'
sudo ufw --force enable

# Oracle Cloud iptables rule fix (Oracle Ubuntu has custom INPUT chain rules)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8800 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5432 -j ACCEPT || true
sudo netfilter-persistent save || true

echo "════════════════════════════════════════════════════════════════"
echo "✅ Oracle Cloud Environment Setup Complete!"
echo "Next step: Run 'docker compose up -d --build' in Mission-Control/Gaming/distributed_server"
echo "════════════════════════════════════════════════════════════════"
