# 推送到 GitHub 指南

## 📋 准备工作

### 1. 检查文件状态

```bash
cd /Users/wangwei/Desktop/Projects/log_stm32_helper

# 查看将被提交的文件
git status

# 查看将被忽略的文件
git status --ignored
```

### 2. 确认 .gitignore 配置

已配置忽略以下内容：
- ✅ Rust 编译产物 (`target/`)
- ✅ Node 模块 (`node_modules/`)
- ✅ Python 虚拟环境 (`venv/`, `.venv*/`)
- ✅ 系统文件 (`.DS_Store`, `Thumbs.db`)
- ✅ IDE 配置 (`.vscode/`, `.idea/`)
- ✅ 日志和临时文件 (`*.log`, `*.tmp`)
- ✅ 环境变量文件 (`.env`)
- ✅ 图标备份文件 (`*_original.png`)

## 🚀 推送步骤

### 方案 A: 全新仓库

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建首次提交
git commit -m "feat: Initial commit - MCU Log Debugger

✨ 核心功能:
- 串口通信与实时日志显示
- 多维度过滤 (级别/Tag/关键字)
- 书签和搜索功能
- HEX 模式支持
- 多格式导出 (TXT/CSV/JSON)
- 自动保存功能
- 设置管理与持久化存储

🎨 UI 特性:
- 现代化双主题 (亮色/暗色)
- 自定义下拉框组件
- 虚拟滚动优化
- Toast 通知系统
- 圆角应用图标

🔧 技术栈:
- Tauri 1.5+ + Rust
- 跨平台支持 (macOS/Windows/Linux)
- 虚拟串口测试支持

📦 CI/CD:
- GitHub Actions 自动构建
- 多平台发布流程"

# 4. 在 GitHub 创建新仓库
# 访问 https://github.com/new
# 仓库名: log_stm32_helper 或 mcu-log-debugger
# 不要初始化 README, .gitignore 或 LICENSE (本地已有)

# 5. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 6. 推送到 GitHub
git branch -M main
git push -u origin main
```

### 方案 B: 已有 Git 仓库

```bash
# 1. 检查当前状态
git status

# 2. 添加新文件
git add .

# 3. 提交更改
git commit -m "feat: Add settings management and Windows build support

- 新增设置界面 (保存路径、导出格式、自动保存间隔)
- 添加 Tauri 文件保存 API
- 配置持久化 (Rust + localStorage)
- 设置圆角应用图标
- 配置 GitHub Actions 工作流 (Windows/全平台构建)
- 完善文档 (BUILD_GUIDE, CROSS_COMPILE_WINDOWS)
- 修复 UI 问题 (Tag 过滤、表头显示、HEX 模式)"

# 4. 推送到 GitHub
git push origin main
```

## 📝 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` - 新功能
- `fix:` - Bug 修复
- `docs:` - 文档更新
- `style:` - 代码格式 (不影响功能)
- `refactor:` - 重构
- `perf:` - 性能优化
- `test:` - 测试相关
- `chore:` - 构建/工具配置

示例：
```bash
git commit -m "feat: Add settings modal for save path configuration"
git commit -m "fix: Resolve tag filter toggle bug"
git commit -m "docs: Update README with latest features"
```

## 🔐 推送前检查清单

- [ ] 确认没有敏感信息（密码、密钥、token）
- [ ] 确认 `.gitignore` 正确配置
- [ ] 确认所有测试通过
- [ ] 确认文档已更新
- [ ] 确认提交信息清晰明了

```bash
# 检查敏感信息
git diff --cached | grep -iE '(password|secret|key|token|api)'

# 检查文件大小
git ls-files --stage | awk '{if($4 > 1048576) print $4/1048576 " MB\t" $1}' | sort -rn

# 查看提交内容
git show
```

## 🎯 推送后操作

### 1. 验证推送成功

访问 GitHub 仓库页面，确认文件已上传。

### 2. 配置仓库设置

在 GitHub 仓库设置中：
- 添加描述和标签
- 启用 Issues 和 Discussions (可选)
- 设置分支保护规则 (可选)

### 3. 触发 GitHub Actions

**手动构建 Windows 版本**:
1. 进入仓库 Actions 标签
2. 选择 "Build Windows App" 工作流
3. 点击 "Run workflow"
4. 等待构建完成（约 10-15 分钟）
5. 下载 Artifacts

**自动发布**:
```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# GitHub Actions 将自动:
# - 构建 macOS (ARM64 + x86_64)
# - 构建 Windows (x64)
# - 构建 Linux (x64)
# - 创建 GitHub Release
```

### 4. 更新 README

在 GitHub 上编辑 README，添加：
- 下载链接
- 演示截图
- 徽章 (badge)

## 🔄 日常开发流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支 (可选)
git checkout -b feature/new-feature

# 3. 开发和测试
# ... 编码 ...

# 4. 提交更改
git add .
git commit -m "feat: Add new feature"

# 5. 推送到远程
git push origin feature/new-feature

# 6. 创建 Pull Request (可选)
# 在 GitHub 网页上操作
```

## 🐛 常见问题

### 问题 1: 推送被拒绝

```bash
# 原因: 远程仓库有本地没有的提交
# 解决:
git pull origin main --rebase
git push origin main
```

### 问题 2: 文件过大

```bash
# 查找大文件
find . -type f -size +10M

# 从历史中移除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/large/file" \
  --prune-empty --tag-name-filter cat -- --all
```

### 问题 3: 误提交敏感信息

```bash
# 1. 从最新提交中移除
git rm --cached sensitive-file
git commit --amend -m "Remove sensitive file"
git push origin main --force

# 2. 从历史中彻底移除
# 使用 BFG Repo-Cleaner 或 git-filter-repo
```

## 📊 推送统计

查看推送统计：

```bash
# 查看提交历史
git log --oneline --graph --all

# 查看文件变更统计
git diff --stat

# 查看贡献者统计
git shortlog -sn
```

## 🎉 完成！

推送成功后，你的项目已经在 GitHub 上了！

下一步：
1. ⭐ Star 你的项目
2. 📝 完善 README 和文档
3. 🚀 触发第一次 GitHub Actions 构建
4. 📢 分享你的项目

---

**需要帮助？**
- 查看 [GitHub Docs](https://docs.github.com/)
- 查看 [Git 教程](https://git-scm.com/book/zh/v2)
