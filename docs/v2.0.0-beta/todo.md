v1.x vs v2.0 功能迁移对比报告 (v2.0.0-beta)
功能模块	v1.x 核心要求 (基于文档)	v2.0 实现状态	源代码位置 (v2.0)	备注 / 缺失项
串口管理	自动检测、连接/断开、波特率/校验位配置	✅ 已完成	features/serial/	包含串口列表优化逻辑
日志解析	符合 LOG_PROTOCOL.md 正则解析	✅ 已完成	features/log/parser.js	完美对齐 v1 协议
Log 渲染	结构化表格、徽章颜色、虚拟渲染	✅ 已完成	features/log/renderer.js	渲染逻辑已模块化
级别过滤	v1.0.2 多选 (VERBOSE-ERROR)	✅ 已完成	features/log/levelMultiselect.js	已补齐交互与高亮逻辑
Tag 过滤	动态 Tag 列表、全选/反选	✅ 已完成	features/log/tagFilter.js	已增加空白区域点击委托
高级搜索	正则、大小写、全词匹配、计数	✅ 已完成	features/search/searchController.js	包含 \b 全词逻辑
搜索增强	正则快捷按钮 (0x...等)	⚠️ 部分实现	ui/dom.js (有引用)	缺失：快捷按钮的事件绑定
显示模式	Log / HEX / Normal 三种模式	✅ 已完成	features/displayMode/	支持平滑切换与状态记录
视图锁定	搜索/手动滚动时冻结，新消息计数	⚠️ 部分实现	features/scroll/smartScroll.js	缺失：右下角新消息提示卡
导出功能	TXT / CSV / JSON 导出	✅ 已完成	features/log/exportController.js	包含浏览器下载兜底
保存/设置	保存路径设置、自动保存持久化	✅ 已完成	features/settings/	已补齐前后端调用闭环
发送面板	文本/HEX发送、循环发送、快捷指令	✅ 已完成	features/send/sendPanel.js	包含芯片风格快捷指令
快捷键	Cmd+1/2/3, Cmd+L, Cmd+,	⚠️ 部分实现	app/events.js	缺失：Cmd+, 打开设置
⚠️ 缺失项 TODO List (需要下一步补齐)
我已更新任务列表，以下是 v2.0 迁移中尚未 100% 对齐的细节：
[搜索增强] 补齐正则快捷按钮的点击填充逻辑（例如点击 [0x...] 自动填入搜索框并触发）。
[视图锁定] 实现右下角的“新消息提醒”悬浮卡片（显示 +N 条新消息 及“解锁”按钮）。
[快捷键] 在 events.js 中增加 Cmd/Ctrl + , 快捷键以快速打开设置弹窗。
[右键菜单] 检查并确保右键菜单中的“按此 Tag 过滤”等快捷操作已连接到新模块。