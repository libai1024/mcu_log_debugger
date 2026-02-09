# MCU Log Debugger 构建指南

本文档介绍如何在各个平台上构建和打包 MCU Log Debugger 应用。

## 目录

- [开发环境要求](#开发环境要求)
- [本地开发构建](#本地开发构建)
- [生产环境打包](#生产环境打包)
- [跨平台构建](#跨平台构建)
- [图标管理](#图标管理)

---

## 开发环境要求

### 所有平台通用

- **Rust**: >= 1.70
  ```bash
  # 安装 Rust
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

- **Node.js**: >= 18
  ```bash
  # macOS
  brew install node
  
  # Windows (使用 Chocolatey)
  choco install nodejs
  ```

- **Tauri CLI**: 
  ```bash
  npm install -g @tauri-apps/cli@1
  ```

### macOS 特定要求

- Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```

### Linux 特定要求

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.0-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libudev-dev
```

### Windows 特定要求

- Visual Studio 2019/2022 (包含 C++ 工作负载)
- 或 Visual Studio Build Tools

---

## 本地开发构建

### 1. 克隆项目

```bash
cd /Users/wangwei/Desktop/Projects/log_stm32_helper
```

### 2. 开发模式运行

```bash
# 使用 Tauri CLI
tauri dev

# 或使用 Cargo
cd src-tauri
cargo run
```

应用将在开发模式下启动，支持热重载。

---

## 生产环境打包

### macOS

```bash
# Apple Silicon (ARM64)
tauri build --target aarch64-apple-darwin

# Intel (x86_64)
tauri build --target x86_64-apple-darwin

# Universal Binary (支持两种架构)
tauri build --target universal-apple-darwin
```

**输出位置**:
- DMG: `src-tauri/target/release/bundle/dmg/`
- App: `src-tauri/target/release/bundle/macos/`

### Windows

```bash
tauri build
```

**输出位置**:
- MSI: `src-tauri/target/release/bundle/msi/`
- NSIS: `src-tauri/target/release/bundle/nsis/`
- EXE: `src-tauri/target/release/mcu-log-debugger.exe`

### Linux

```bash
tauri build
```

**输出位置**:
- DEB: `src-tauri/target/release/bundle/deb/`
- AppImage: `src-tauri/target/release/bundle/appimage/`

---

## 跨平台构建

### 在 macOS 上构建 Windows 应用

**最佳方案**: 使用 GitHub Actions（自动化）

1. **设置 GitHub 仓库** (如果还没有)
   ```bash
   git init
   git remote add origin <your-github-repo-url>
   ```

2. **推送代码**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

3. **手动触发构建**
   - 访问 GitHub 仓库
   - 进入 "Actions" 标签
   - 选择 "Build Windows App" 或 "Release" 工作流
   - 点击 "Run workflow"
   - 等待构建完成
   - 从 "Artifacts" 下载构建产物

4. **自动发布** (可选)
   ```bash
   # 创建版本标签
   git tag v1.0.0
   git push origin v1.0.0
   
   # GitHub Actions 将自动构建所有平台并创建 Release
   ```

**替代方案**: 参见 [CROSS_COMPILE_WINDOWS.md](./CROSS_COMPILE_WINDOWS.md)

### 在 Windows 上构建 macOS 应用

❌ 不推荐，建议使用 GitHub Actions

### 在 Linux 上构建其他平台

推荐使用 Docker + GitHub Actions

---

## 图标管理

### 当前图标

项目已配置圆角图标，所有图标文件位于 `src-tauri/icons/` 目录。

### 更新图标

1. **准备图标源文件**
   - 格式: PNG
   - 尺寸: 1024x1024 或更大
   - 透明背景 (推荐)

2. **生成所有尺寸**
   ```bash
   # 使用 Tauri CLI
   tauri icon path/to/your/icon.png
   ```

3. **添加圆角效果**
   ```bash
   # 确保在虚拟环境中安装了 Pillow
   source venv/bin/activate
   python3 add_rounded_corners.py
   ```

### 图标文件说明

- `icon.png`: 主图标 (1024x1024)
- `32x32.png`, `128x128.png`, `128x128@2x.png`: macOS 应用图标
- `icon.icns`: macOS 图标包
- `icon.ico`: Windows 图标
- `Square*.png`: Windows 应用商店图标
- `StoreLogo.png`: Windows 商店 Logo

**备份文件**: 原始图标会自动备份为 `*_original.png`

---

## 构建优化

### 减小文件大小

在 `src-tauri/Cargo.toml` 中配置:

```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"  # 或 "z" 以获得更小的体积
strip = true
```

### 启用调试信息

```bash
# 构建带调试信息的 release 版本
tauri build -- --features debug
```

---

## 故障排除

### 错误: "cargo not found"

```bash
# 添加 cargo 到 PATH
export PATH="$HOME/.cargo/bin:$PATH"

# 或重新安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 错误: "WebView2 not found" (Windows)

下载并安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 错误: "xcrun: error" (macOS)

```bash
sudo xcode-select --reset
xcode-select --install
```

### 构建速度慢

```bash
# 使用更多 CPU 核心
export CARGO_BUILD_JOBS=8

# 使用 sccache 缓存
cargo install sccache
export RUSTC_WRAPPER=sccache
```

---

## CI/CD 工作流

项目包含以下 GitHub Actions 工作流:

1. **`build-windows.yml`**: 仅构建 Windows 版本
   - 触发: 手动或推送标签
   - 输出: Windows MSI/NSIS 安装包

2. **`release.yml`**: 构建所有平台并自动发布
   - 触发: 推送版本标签 (如 `v1.0.0`)
   - 输出: macOS, Windows, Linux 安装包
   - 自动创建 GitHub Release

### 使用示例

```bash
# 发布新版本
git tag v1.0.1
git push origin v1.0.1

# 等待 GitHub Actions 完成
# 访问 https://github.com/<your-repo>/releases 查看发布
```

---

## 测试

### 单元测试

```bash
cd src-tauri
cargo test
```

### 集成测试

使用 `test_log_simulator.py` 测试串口功能:

```bash
# 设置虚拟串口
./setup_test_env.sh

# 运行模拟器
python3 test_log_simulator.py --port /dev/ttys019 --mode continuous
```

参见 [TEST_GUIDE.md](./TEST_GUIDE.md) 了解详细测试说明。

---

## 下一步

1. ✅ 已配置圆角图标
2. ✅ 已设置 GitHub Actions 工作流
3. ⏭️ 推送代码到 GitHub
4. ⏭️ 触发第一次构建
5. ⏭️ 测试安装包

---

## 相关文档

- [CROSS_COMPILE_WINDOWS.md](./CROSS_COMPILE_WINDOWS.md) - Windows 交叉编译详细指南
- [TEST_GUIDE.md](./TEST_GUIDE.md) - 测试指南
- [LOG_PROTOCOL.md](./LOG_PROTOCOL.md) - 日志协议说明
- [Tauri 官方文档](https://tauri.app/)

---

**需要帮助?** 查看故障排除部分或提交 Issue。
