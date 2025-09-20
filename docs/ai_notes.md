# AI 笔记
## 项目背景
我正在做一个辩论图的web应用，后端使用python+fastapi+fastapi-users编写，前端在frontend中已用vite模板（vue ts）写好大致框架，docs/中API相关文档已提供。
辩论图中每个观点都是一个节点，相互通过支持、反驳边连接，每个点有或和与的属性以管理与子节点的关系。一个“辩论debate”就是若干节点的集合，可通过多个辩论来管理众观点。默认必须有一个“全辩论”，用以查看所有观点。
前端有数个页面，一个是辩论页，为主页；一个是设置页；一个是对应某辩论的观点页，需调用点、边的增删查改等API。

## 目录结构
docs/
├── ai_notes.md    # AI 相关笔记
├── api.md         # API 文档
├── db.md          # 数据库设计文档
├── help.md        # 帮助文档

frontend/src/
├── components/          # 组件库
│   ├── ui/             # 通用 UI 组件
│   │   ├── index.ts
│   │   └── UiNotification.vue
│   ├── LinkEditor.vue   # 链接编辑器
│   ├── OpinionEditor.vue # 观点编辑器（重构后<300行）
│   ├── OpinionEditor/   # OpinionEditor组件模块
│   │   └── OpinionForm.vue      # 表单UI组件
│   ├── OpinionGraph/    # OpinionGraph组件模块
│   │   ├── OpinionGraphCore.vue # 核心图组件
│   │   ├── ContextMenu.vue      # 右键菜单组件
│   │   ├── cytoscapeStyles.ts   # 样式配置
│   │   ├── cytoscapeUtils.ts    # 工具函数
│   │   └── styles.css           # 组件样式
│   ├── OpinionGraph.vue # 观点图组件
│   └── NotificationContainer.vue # 通知组件
├── composables/         # 组合式函数（重构后分层架构）
│   ├── index.ts         # 统一导出入口
│   ├── core/           # 核心业务逻辑（全局复用）
│   │   ├── useAuth.ts  # 认证逻辑
│   │   ├── useDebates.ts
│   │   ├── useNotifications.ts
│   │   └── useOpinionGraph/ # 图功能模块
│   │       ├── index.ts                 # 模块入口
│   │       ├── useOpinionGraph.ts       # 主图组合函数
│   │       ├── useGraphState.ts         # 状态管理
│   │       ├── useGraphSearch.ts        # 搜索功能
│   │       ├── useGraphSettings.ts      # 设置管理
│   │       ├── useGraphElements.ts      # 元素操作
│   │       ├── useGraphOperations.ts    # 加载逻辑
│   │       └── useGraphCRUD.ts          # CRUD操作
│   ├── ui/             # UI 交互逻辑（跨组件复用）
│   │   └── useContextMenu.ts    # 右键菜单逻辑
│   └── features/       # 功能特性逻辑（领域特定但可复用）
│       ├── debate/
│       │   └── useDebateSearch.ts    # 辩论搜索功能
│       ├── opinion/
│       │   ├── useOpinionForm.ts     # 表单状态管理
│       │   ├── useEditorState.ts     # 编辑器状态
│       │   └── useCRUDFixes.ts       # CRUD修复逻辑
│       └── graph/
│           └── useNodeArrows.ts      # 箭头管理
├── services/            # API 服务层
│   ├── index.ts
│   ├── auth.ts
│   ├── ai_maker.ts
│   ├── api.ts
│   ├── debate.ts
│   ├── opinion.ts
│   └── link.ts
├── pages/               # 页面组件
│   ├── DebateList.vue   # 辩论列表（重构后<300行）
│   ├── DebateOpinion.vue # 观点页面（重构后<300行）
│   ├── DebateOpinion/   # DebateOpinion页面模块
│   │   ├── PageHeader.vue        # 页面头部
│   │   ├── SearchOverlay.vue     # 搜索覆盖层
│   │   └── HelpSection.vue       # 帮助部分
│   └── Settings.vue
├── types/               # 类型定义
│   ├── data.ts
│   └── index.ts
├── utils/               # 工具函数
│   └── index.ts
├── config/              # 配置文件
│   └── index.ts
├── styles/              # 样式系统
│   └── style.css
├── tests/               # 测试文件
│   ├── components/
│   │   └── UiButton.test.ts      # UI组件测试
│   └── composables/
│       └── useDebates.test.ts    # 组合函数测试
├── router.ts        # 路由配置
├── main.ts          # 入口文件
├── App.vue          # 根组件

## 工程实践
- 目录文件结构清晰，职责分明
- 文件代码不要过长（尽量保持<300行）
- 在本文件中记录和更新相关笔记

## 已做部分
- 所有后端代码
- 前端辩论页、观点页、设置页的基本框架
- 观点页的点、边的增删查改
- 观点图加载逻辑优化
    - 首先加载辩论的根节点（结论观点，设置maxUpdatedSon）
    - ✅ 加载节点时不适配屏幕位置，只需提供手动适配屏幕的按钮
    - 布局配置默认设置 `fit: false`，避免每次加载新节点时自动适配屏幕
    - 保留手动 `fitToView()` 功能供用户主动使用
- ✅ 观点加载逻辑需考虑**双向**
    - ✅ 提供观点搜索框，可快速定位到某观点并居中，再自动加载其父、子节点（用maxUpdatedSon限制父或子数量）
    - ✅ 节点有相邻节点未显示时，先用border提示，若hover节点则在节点的上下两侧分别加小箭头。单击箭头则加载相应方向的节点（设置loadDepth和numClickUpdatedSon）

## 未做部分
