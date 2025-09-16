import { createApp } from 'vue';
import './styles/style.css';
import App from './App.vue';
import router from './router';
import { useAuth } from '@/composables/core/useAuth';
// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976d2',
          secondary: '#424242',
          accent: '#82b1ff',
          error: '#ff5252',
          info: '#2196f3',
          success: '#4caf50',
          warning: '#ffc107',
          shadow: 'rgba(0, 0, 0, 0.1)',
        },
      },
      dark: {
        colors: {
          primary: '#2196f3',
          secondary: '#424242',
          accent: '#ff4081',
          error: '#ff5252',
          info: '#2196f3',
          success: '#4caf50',
          warning: '#ffc107',
          shadow: 'rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
});

const app = createApp(App);
app.use(router);
app.use(vuetify);
app.mount('#app');

const { fetchUserInfo } = useAuth();
// 首次加载时获取用户信息，保持登录状态
fetchUserInfo(true);
