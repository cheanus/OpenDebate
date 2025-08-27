export const APP_CONFIG = {
  // 应用名称
  name: 'OpenDebate',
  version: '1.0.0',

  // API 配置
  api: {
    baseUrl: '/api',
    timeout: 30000,
  },

  // 图形配置
  graph: {
    defaultLayout: {
      name: 'dagre',
      rankDir: 'BT', // bottom-to-top
      nodeSep: 50,
      edgeSep: 10,
      rankSep: 80,
      fit: false, // 加载节点时不适配屏幕
      padding: 50,
    },

    // 节点样式配置
    nodeStyles: {
      minSize: 40,
      maxSize: 180,
      borderWidth: {
        normal: 0,
        hasMore: 6,
      },
    },

    // 边样式配置
    edgeStyles: {
      width: 4,
      opacity: 0.7,
      colors: {
        supports: '#00b894',
        opposes: '#e17055',
      },
    },
  },

  // 默认设置
  defaults: {
    maxUpdatedSon: 5,
    numClickUpdatedSon: 5,
    loadDepth: 2, // 每次箭头点击加载的深度
    creator: 'user',
  },

  // UI 配置
  ui: {
    debounceDelay: 500,
    pageSize: 20,
    maxPageSize: 100,
  },

  // 存储键名
  storageKeys: {
    debateSettings: 'debate_settings',
    defaultCreator: 'default_creator',
    userPreferences: 'user_preferences',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
