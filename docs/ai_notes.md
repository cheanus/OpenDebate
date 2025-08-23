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

frontend/
├── src/
│    ├── components/          # 组件库
│    │   ├── ui/             # 通用 UI 组件
│    │   │   ├── UiButton.vue
│    │   │   ├── UiModal.vue
│    │   │   └── UiInput.vue
│    │   ├── LinkEditor.vue   # 重构后的链接编辑器
│    │   ├── OpinionEditor.vue # 重构后的观点编辑器
│    │   └── OpinionGraph.vue  # 重构后的观点图
│    ├── composables/         # 组合式函数
│    │   ├── useDebates.ts
│    │   └── useOpinionGraph.ts
│    ├── services/            # API 服务层
│    │   ├── api.ts
│    │   ├── debate.ts
│    │   ├── opinion.ts
│    │   └── link.ts
│    ├── pages/               # 页面组件
│    │   ├── DebateList.vue   # 重构后的辩论列表
│    │   ├── DebateOpinion.vue # 重构后的观点页面
│    │   └── Settings.vue
│    ├── types/               # 类型定义
│    │   ├── data.ts
│    │   └── index.ts
│    ├── utils/               # 工具函数
│    │   └── index.ts
│    ├── config/              # 配置文件
│    │   └── index.ts
│    ├── styles/              # 样式系统
│    │   └── variables.css
│    ├── tests/               # 测试文件
│    │   ├── components/
│    │   └── composables/
├── router.ts        # 路由配置
├── main.ts          # 入口文件
├── App.vue          # 根组件
├── index.html       # HTML 模板

## 已做部分
- 所有后端代码
- 前端辩论页
- 前端观点页的观点展示
- 观点页的点、边的增删查改

## 未做部分

在良好的工程实践下解决以下事项：
- [x] 美术设计等细节改善
- [ ] 观点图加载逻辑优化
    - 首先加载辩论的根节点（结论观点）
    - 双击节点时加载其子孙节点，每次双击时，加载一定深度（可设置），并限制加载节点的子节点数量（可设置）
    - 加载节点时无需适配屏幕位置囊括所有节点，只需提供适配屏幕的按钮
- [ ] 修补点、边的增删查改的bug
