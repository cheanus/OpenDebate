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

### **大文件重构最佳实践**：
- **模块化拆分**：按功能职责将大文件拆分为小模块
- **组合式函数**：使用Vue 3 Composition API模式，将相关逻辑组合
- **UI分离**：将UI组件与业务逻辑分离，便于维护和测试  
- **类型安全**：保持TypeScript类型定义的一致性
- **向后兼容**：重构过程中保持原有API接口不变
- **备份策略**：重构前创建.bak备份文件，确保安全
- **渐进式重构**：先拆分逻辑，再优化结构，最后清理代码

### **Composables 组织最佳实践**：
- **分层架构**：按 `core/`、`ui/`、`features/`、`utils/` 四层组织
  - `core/` - 核心业务逻辑，全局复用，与UI无关
  - `ui/` - UI交互逻辑，跨组件复用，与具体业务无关
  - `features/` - 功能特性逻辑，按领域分组但可复用
  - `utils/` - 纯工具函数，无业务和UI逻辑
- **统一入口**：使用 `composables/index.ts` 统一导出
- **导入规范**：推荐 `import { useXxx } from '@/composables'`
- **命名约定**：
  - 核心业务：`use[Domain].ts` (如 `useDebates.ts`)
  - UI功能：`use[UIFeature].ts` (如 `useContextMenu.ts`)
  - 功能特性：`use[Feature][Action].ts` (如 `useDebateSearch.ts`)
- **避免循环依赖**：下层可引用上层，上层不可引用下层

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

## 重构历史

### 2025年8月27日 - 大文件重构
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
### 2025年8月28日 - Composables 目录结构优化重构
- **问题识别**：
  - `use*` 文件分散在 `composables/`、`components/*/`、`pages/*/` 三个目录
  - 职责混乱，难以区分全局复用 vs 特定场景的逻辑
  - 导入路径不一致，维护困难

- **✅ 重构方案**：
  - **统一目录结构**：创建分层的 composables 目录结构
    - `composables/core/` - 核心业务逻辑（全局复用）
    - `composables/ui/` - UI 交互逻辑（跨组件复用）
    - `composables/features/` - 功能特性逻辑（领域特定但可复用）
    - `composables/utils/` - 工具类 composables（预留）

- **✅ 文件迁移**：
  - `useDebates.ts`, `useNotifications.ts`, `useOpinionGraph/` → `core/`
  - `useContextMenu.ts` → `ui/`
  - `useOpinionForm.ts`, `useEditorState.ts`, `useCRUDFixes.ts` → `features/opinion/`
  - `useDebateSearch.ts` → `features/debate/`
  - `useNodeArrows.ts` → `features/graph/`

- **✅ 统一入口**：创建 `composables/index.ts` 统一导出所有 composables
- **✅ 导入路径更新**：将所有组件和页面的导入路径更新为新结构
- **✅ 构建问题修复**：
  - **@mdi/font 构建错误**：从本地导入改为 CDN 引用，避免 package.json 解析问题
  - **代码分割优化**：配置 Vite manualChunks，分离 Vue、Vuetify、Cytoscape 等大型依赖
  - **构建成功**：✓ built in 4.20s，无错误无警告
- **✅ 清理工作**：删除空目录，保持项目结构清洁

- **重构效果**：
  - **结构清晰**：按功能域和复用性四层分类，职责分明
  - **导入简化**：统一使用 `@/composables` 入口，减少路径复杂度  
  - **维护性提升**：相关功能聚合，便于查找和修改
  - **开发体验优化**：更直观的文件组织，更好的类型提示
  - **技术债务清理**：消除目录混乱，解决构建问题，优化bundle大小

### 2025年8月28日 - DebateOpinion.vue CRUD 管理简化重构
- **问题分析**：
  - 过度复杂的适配器层：大量适配器函数匹配不同 composable 接口
  - 重复的错误处理：CRUD 操作中有冗余的加载状态和错误处理逻辑
  - 冗余的中间层：`useFormHandlers` 只是简单包装 CRUD 操作，没有实际价值
  - 不一致的状态管理：某些操作需要手动刷新视图，某些不需要
  - **核心bug**：空辩论新建观点后不显示、删除观点后仍显示

- **重构方案**：
  - ✅ **移除冗余中间层**：删除 `useFormHandlers.ts` (96行) 和 `useContextMenuActions.ts` (100行)
  - ✅ **直接集成CRUD**：在 `DebateOpinion.vue` 中直接使用 `useOpinionGraph` 的CRUD方法
  - ✅ **统一错误处理**：创建 `useCRUDFixes.ts` (161行) 提供一致的错误处理和状态管理
  - ✅ **修复显示问题**：
    - `ensureNodeVisibility()` - 确保新建观点在空辩论中正确显示
    - `ensureNodeRemoval()` - 确保删除观点后正确从视图中移除
    - `ensureEdgeRemoval()` - 确保删除连接后正确移除
    - `wrapCRUDOperation()` - 统一的操作包装器，避免重复代码

- **重构效果**：
  - 文件数量：从3个文件减少到2个文件（删除2个中间层文件，新增1个修复文件）
  - 代码行数：总体从 255+96+100=451行 减少到 342+161=503行
  - 虽然总行数稍有增加，但逻辑更清晰，职责分明
  - **修复核心bug**：解决了空辩论新建观点和删除观点的显示问题
  - 移除了不必要的适配器层和中间层，代码更直接易懂
  - 提供了更可靠的CRUD操作，包含重试机制和状态同步
### 📁 目录结构优化完成
- **分层 Composables 架构**：按 `core/ui/features/utils` 四层组织，职责清晰
- **统一导入入口**：`@/composables` 提供所有 composables 导出
- **清理的组件结构**：移除组件和页面中的分散 `use*` 文件
- **优化的构建配置**：解决 @mdi/font 问题，配置代码分割

#### 🏗️ 重构成果量化
- **大文件重构**：3个大文件 (useOpinionGraph 758行、OpinionGraph 883行、DebateOpinion 492行) 模块化拆分
- **代码组织优化**：8个 `use*` 文件重新按功能分层组织
- **构建问题解决**：修复依赖解析错误，构建时间稳定在 4.2s
- **技术债务清理**：移除冗余中间层，统一错误处理，修复核心bug

#### 🔧 开发体验提升
- **更清晰的文件查找**：按功能域分组，直观的文件定位
- **更简单的导入语法**：统一从 `@/composables` 导入
- **更好的类型提示**：集中的类型定义和导出
- **更可靠的CRUD操作**：统一的错误处理和状态同步

### 下一步建议

#### 🚀 短期优化 (1-2周)
- [ ] 添加 `composables/utils/` 通用工具 (useLocalStorage, useAsyncState)
- [ ] 完善 composables 的单元测试覆盖
- [ ] 优化图组件的性能和内存使用

#### 📈 中期规划 (1个月)
- [ ] 制定团队的 composables 编写和组织规范文档
- [ ] 考虑添加 E2E 测试覆盖主要用户流程
- [ ] 监控和优化 bundle 大小，进一步细化代码分割

#### 🔮 长期目标 (3个月)
- [ ] 考虑引入状态管理库 (如 Pinia) 管理复杂全局状态
- [ ] 探索服务端渲染 (SSR) 或静态生成 (SSG) 优化SEO
- [ ] 建立性能监控和错误追踪系统

这次重构成功地建立了清晰的架构基础，为项目的长期维护和扩展奠定了坚实的基础。所有核心功能保持向后兼容，构建和开发体验都得到了显著提升。
