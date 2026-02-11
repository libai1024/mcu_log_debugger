# 在 macOS 上为 Windows 打包 Tauri 应用

本指南将帮助你在 macOS 上交叉编译并打包 Windows 版本的 MCU Log Debugger。

## 方法一：使用 GitHub Actions（推荐）

这是最简单且最可靠的方法，利用 GitHub Actions 在 Windows 环境中自动构建。

### 1. 创建 GitHub Actions 工作流

创建 `.github/workflows/build.yml`：

```yaml
name: Build Windows App

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          profile: minimal
          override: true

      - name: Install dependencies
        run: cargo build --release --manifest-path src-tauri/Cargo.toml

      - name: Build Tauri app
        run: |
          npm install -g @tauri-apps/cli
          tauri build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: src-tauri/target/release/bundle/msi/*.msi
```

### 2. 推送代码并触发构建

```bash
git add .
git commit -m "Add Windows build workflow"
git push
```

然后在 GitHub 仓库的 Actions 标签页手动触发构建。

---

## 方法二：使用 cargo-xwin（本地交叉编译）

⚠️ **注意**: 这种方法较为复杂，可能会遇到依赖问题。

### 1. 安装 Windows 交叉编译工具链

```bash
# 安装 Windows 目标平台
rustup target add x86_64-pc-windows-msvc

# 安装 cargo-xwin（用于在非 Windows 系统上编译 Windows 程序）
cargo install cargo-xwin

# 安装 LLVM（需要 lld-link）
brew install llvm
```

### 2. 配置 Cargo 交叉编译

创建或编辑 `~/.cargo/config.toml`：

```toml
[target.x86_64-pc-windows-msvc]
linker = "lld-link"
rustflags = ["-C", "target-feature=+crt-static"]
```

### 3. 尝试构建

```bash
cd /Users/wangwei/Desktop/Projects/log_stm32_helper
cargo xwin build --release --target x86_64-pc-windows-msvc --manifest-path src-tauri/Cargo.toml
```

**已知问题**:
- `serialport` 库可能在交叉编译时出现问题
- Windows 特定的系统依赖可能缺失
- 需要手动处理 Windows 安装包生成

---

## 方法三：使用 Docker（推荐用于 CI/CD）

### 1. 创建 Dockerfile

创建 `Dockerfile.windows`：

```dockerfile
FROM rust:latest

# 安装 Windows 交叉编译工具
RUN apt-get update && apt-get install -y \
    mingw-w64 \
    && rm -rf /var/lib/apt/lists/*

# 添加 Windows 目标
RUN rustup target add x86_64-pc-windows-gnu

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 构建
CMD ["cargo", "build", "--release", "--target", "x86_64-pc-windows-gnu"]
```

### 2. 构建

```bash
docker build -f Dockerfile.windows -t log-debugger-windows .
docker run --rm -v $(pwd)/target:/app/target log-debugger-windows
```

---

## 方法四：使用 Windows 虚拟机或实体机（最可靠）

### 选项 A: 使用 Parallels/VMware/VirtualBox

1. 安装 Windows 虚拟机
2. 在虚拟机中安装开发环境：
   - Rust: https://rustup.rs/
   - Node.js: https://nodejs.org/
3. 共享文件夹，在虚拟机中构建

### 选项 B: 使用远程 Windows 机器

如果你有访问权限到 Windows 电脑：

```bash
# 在 macOS 上打包源代码
cd /Users/wangwei/Desktop/Projects/log_stm32_helper
tar -czf log-debugger-source.tar.gz \
  --exclude=target \
  --exclude=node_modules \
  --exclude=.venv* \
  src-tauri/ public/ *.md *.json *.py

# 传输到 Windows 机器
scp log-debugger-source.tar.gz user@windows-pc:~/

# 在 Windows 上解压并构建
# (在 Windows PowerShell 中)
# tar -xzf log-debugger-source.tar.gz
# cd log-debugger
# cargo install @tauri-apps/cli
# tauri build
```

---

## 推荐流程

**对于个人项目**: 使用方法一（GitHub Actions）或方法四（虚拟机）

**对于团队项目**: 使用方法一（GitHub Actions）+ 方法三（Docker）作为备份

**快速测试**: 使用方法四的虚拟机

---

## 构建成功后

构建完成后，Windows 安装包将位于：

- **MSI 安装包**: `src-tauri/target/release/bundle/msi/MCU Log Debugger_1.0.0_x64_en-US.msi`
- **NSIS 安装包**: `src-tauri/target/release/bundle/nsis/MCU Log Debugger_1.0.0_x64-setup.exe`
- **便携版**: `src-tauri/target/release/mcu-log-debugger.exe`

---

## 故障排除

### 错误: 缺少 Windows SDK

```bash
# 方法一和方法二需要 Windows SDK
# 最简单的解决方案是使用 GitHub Actions 或实体 Windows 机器
```

### 错误: serialport 编译失败

```bash
# serialport 依赖于系统库，交叉编译可能失败
# 解决方案: 使用 GitHub Actions 或 Windows 虚拟机
```

### 错误: 链接器错误

```bash
# 确保安装了完整的 LLVM 工具链
brew reinstall llvm
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
```

---

## 下一步

1. **选择一个方法**: 推荐从 GitHub Actions 开始
2. **测试构建**: 确保所有依赖都正确配置
3. **分发**: 将生成的 `.msi` 或 `.exe` 文件分发给用户

---

## 参考资料

- [Tauri 构建文档](https://tauri.app/v1/guides/building/)
- [Rust 交叉编译指南](https://rust-lang.github.io/rustup/cross-compilation.html)
- [cargo-xwin GitHub](https://github.com/rust-cross/cargo-xwin)
