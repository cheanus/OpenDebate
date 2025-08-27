# AI 笔记
## 项目背景
我正在做一个辩论图的web应用，后端已写好，前端在frontend中已用vite模板（vue ts）写好大致框架，docs/中API相关文档已提供。
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
│   │   ├── OpinionForm.vue      # 表单UI组件
│   │   └── useOpinionForm.ts    # 表单状态管理
│   ├── OpinionGraph/    # OpinionGraph组件模块
│   │   ├── OpinionGraphCore.vue # 核心图组件
│   │   ├── ContextMenu.vue      # 右键菜单组件
│   │   ├── cytoscapeStyles.ts   # 样式配置
│   │   ├── cytoscapeUtils.ts    # 工具函数
│   │   ├── styles.css           # 组件样式
│   │   ├── useContextMenu.ts    # 右键菜单逻辑
│   │   └── useNodeArrows.ts     # 箭头管理
│   └── NotificationContainer.vue # 通知组件
├── composables/         # 组合式函数
│   ├── index.ts
│   ├── useDebates.ts
│   ├── useNotifications.ts
│   └── useOpinionGraph/ # 图功能模块
│       ├── index.ts                 # 模块入口
│       ├── useOpinionGraph.ts       # 主图组合函数
│       ├── useGraphState.ts         # 状态管理
│       ├── useGraphSearch.ts        # 搜索功能
│       ├── useGraphSettings.ts      # 设置管理
│       ├── useGraphElements.ts      # 元素操作
│       ├── useGraphOperations.ts    # 加载逻辑
│       └── useGraphCRUD.ts          # CRUD操作
├── services/            # API 服务层
│   ├── index.ts
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
│   │   ├── HelpSection.vue       # 帮助部分
│   │   ├── useEditorState.ts     # 编辑器状态
│   │   ├── useDebateSearch.ts    # 搜索功能
│   │   ├── useFormHandlers.ts    # 表单处理
│   │   └── useContextMenuActions.ts # 右键菜单动作
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
- **大文件重构最佳实践**：
    - **模块化拆分**：按功能职责将大文件拆分为小模块
    - **组合式函数**：使用Vue 3 Composition API模式，将相关逻辑组合
    - **UI分离**：将UI组件与业务逻辑分离，便于维护和测试  
    - **类型安全**：保持TypeScript类型定义的一致性
    - **向后兼容**：重构过程中保持原有API接口不变
    - **备份策略**：重构前创建.bak备份文件，确保安全
    - **渐进式重构**：先拆分逻辑，再优化结构，最后清理代码

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
- 大文件重构（2025年8月27日完成）
    - ✅ **useOpinionGraph.ts** (758行) → 拆分为6个模块化composable
        - `useGraphState.ts` - 图状态管理（节点、边、选中状态）
        - `useGraphSearch.ts` - 搜索功能（节点搜索、居中定位）
        - `useGraphSettings.ts` - 设置管理（主题、动画配置）
        - `useGraphElements.ts` - 元素操作（CRUD操作）
        - `useGraphOperations.ts` - 加载逻辑（深度加载、双向加载）
        - `useOpinionGraph.ts` - 主入口，组合所有功能
    - ✅ **OpinionGraph.vue** (883行) → 拆分为核心组件+工具模块
        - `OpinionGraphCore.vue` - 核心图组件（<300行）
        - `cytoscapeStyles.ts` - Cytoscape样式配置
        - `useNodeArrows.ts` - 节点箭头管理（父子节点提示）
        - `useContextMenu.ts` - 右键菜单功能
        - `cytoscapeUtils.ts` - 图工具函数（布局、定位等）
    - ✅ **DebateOpinion.vue** (492行) → 模块化重构
        - 拆分UI组件：`PageHeader.vue`, `SearchOverlay.vue`, `HelpSection.vue`
        - 专用composables：`useEditorState.ts`, `useDebateSearch.ts`, `useFormHandlers.ts`, `useContextMenuActions.ts`
    - ✅ **DebateList.vue** (369行) → 简化重构，移除冗余代码
    - ✅ **OpinionEditor.vue** (316行) → 表单逻辑分离
        - `useOpinionForm.ts` - 表单状态管理和验证逻辑

## 未做部分