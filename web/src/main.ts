/**
 * Vue 应用入口
 *
 * 配置 Vue Router（Hash 模式）并挂载应用
 * 所有路由都由 App.vue 处理，支持动态路径参数
 */
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import Root from './Root.vue';
import App from './App.vue';
import './style.css';

// 配置路由：使用 Hash 模式（兼容静态文件服务）
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/:path(.*)*', component: App }  // 捕获所有路径
  ]
});

// 创建并挂载应用
createApp(Root).use(router).mount('#app');
