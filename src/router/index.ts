import { route } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  const authStore = useAuthStore();
  const notificationStore = useNotificationStore();
  Router.beforeEach((to) => {
    // ロールに応じてナビゲーションガード
    if (
      to.meta.requireApplicationManager &&
      (!authStore.isLoggedIn || !authStore.isApplicationManager)
    ) {
      notificationStore.show(
        '不正な遷移 または 権限が不足',
        '画面リロードなどにより権限情報が欠損しています。またはこの機能を利用するためには、アプリ管理者かテナント管理者のロールが必要です。'
      );
      return false;
    }
    if (
      to.meta.requireTenantManager &&
      (!authStore.isLoggedIn || !authStore.isTenantManager)
    ) {
      notificationStore.show(
        '不正な遷移 または 権限が不足',
        '画面リロードなどにより権限情報が欠損しています。またはこの機能を利用するためには、テナント管理者のロールが必要です。'
      );
      return false;
    }
  });

  return Router;
});
