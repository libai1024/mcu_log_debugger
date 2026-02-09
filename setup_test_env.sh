#!/bin/bash
# MCU日志助手测试环境设置脚本

set -e

echo "=================================="
echo "  MCU日志助手 - 测试环境设置"
echo "=================================="
echo ""

# 检查Python3
if ! command -v python3 &> /dev/null; then
    echo "✗ 错误: 未找到 python3"
    echo "  请先安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✓ 找到 $PYTHON_VERSION"

# 创建虚拟环境
VENV_DIR="venv"

if [ -d "$VENV_DIR" ]; then
    echo "✓ 虚拟环境已存在: $VENV_DIR"
else
    echo "→ 创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
    echo "✓ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "→ 激活虚拟环境..."
source "$VENV_DIR/bin/activate"

# 升级pip
echo "→ 升级 pip..."
pip install --upgrade pip -q

# 安装依赖
echo "→ 安装依赖包..."
pip install pyserial -q

echo ""
echo "✓ 测试环境设置完成！"
echo ""
echo "=================================="
echo "  使用说明"
echo "=================================="
echo ""
echo "1. 激活虚拟环境:"
echo "   source venv/bin/activate"
echo ""
echo "2. 运行日志模拟器:"
echo "   python3 test_log_simulator.py --help"
echo ""
echo "3. 退出虚拟环境:"
echo "   deactivate"
echo ""
echo "=================================="
echo "  创建虚拟串口对 (macOS)"
echo "=================================="
echo ""
echo "1. 安装 socat:"
echo "   brew install socat"
echo ""
echo "2. 创建虚拟串口对:"
echo "   socat -d -d pty,raw,echo=0 pty,raw,echo=0"
echo ""
echo "3. 记下输出的两个串口路径，例如:"
echo "   /dev/ttys001 <--> /dev/ttys002"
echo ""
echo "4. 一个用于模拟器，一个用于日志助手"
echo ""
