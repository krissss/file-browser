import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import Root from './Root.vue';
import App from './App.vue';
import './style.css';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/:path(.*)*', component: App }
  ]
});

createApp(Root).use(router).mount('#app');
