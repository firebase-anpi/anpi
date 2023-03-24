import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '/',
        redirect: 'safetyConfirmations',
      },

      /**************************
       * 標準機能
       **************************/
      // 安否確認回答
      {
        path: 'safetyConfirmations',
        component: () =>
          import('pages/ApplicationUser/SafetyConfirmationList.vue'),
      },
      {
        path: 'safetyConfirmations/:id/answers/new',
        component: () =>
          import('pages/ApplicationUser/SafetyConfirmationAnswer.vue'),
      },

      // お知らせ
      {
        path: 'informations',
        component: () => import('pages/ApplicationUser/InformationList.vue'),
      },
      {
        path: 'informations/new',
        component: () => import('pages/ApplicationUser/InformationNew.vue'),
        meta: { requireApplicationManager: true },
      },
      {
        path: 'informations/:id',
        component: () => import('pages/ApplicationUser/InformationDetail.vue'),
      },
      {
        path: 'informations/:id/edit',
        component: () => import('pages/ApplicationUser/InformationEdit.vue'),
        meta: { requireApplicationManager: true },
      },

      // メッセージ
      {
        path: 'messages',
        component: () => import('pages/ApplicationUser/MessageList.vue'),
      },

      // ユーザープロフィール
      {
        path: 'profile',
        component: () => import('pages/ApplicationUser/UserProfile.vue'),
      },

      /**************************
       * アプリ管理者以上向け機能
       **************************/
      // 安否確認管理
      {
        path: 'safetyConfirmations/manage/',
        component: () =>
          import('pages/ApplicationManager/SafetyConfirmationList.vue'),
        meta: { requireApplicationManager: true },
      },
      {
        path: 'safetyConfirmations/manage/new',
        component: () =>
          import('pages/ApplicationManager/SafetyConfirmationNew.vue'),
        meta: { requireApplicationManager: true },
      },
      {
        path: 'safetyConfirmations/manage/:id',
        component: () =>
          import('pages/ApplicationManager/SafetyConfirmationDetail.vue'),
        meta: { requireApplicationManager: true },
      },
      {
        path: 'safetyConfirmations/manage/:id/edit',
        component: () =>
          import('pages/ApplicationManager/SafetyConfirmationEdit.vue'),
        meta: { requireApplicationManager: true },
      },

      /**************************
       * テナント管理者向け機能
       **************************/
      {
        path: 'users',
        component: () => import('pages/TenantManager/UserList.vue'),
        meta: { requireTenantManager: true },
      },
      {
        path: 'users/new',
        component: () => import('pages/TenantManager/UserNew.vue'),
        meta: { requireTenantManager: true },
      },
      {
        path: 'users/:id/edit',
        component: () => import('pages/TenantManager/UserEdit.vue'),
        meta: { requireTenantManager: true },
      },
    ],
  },

  {
    path: '/login',
    component: () => import('layouts/SimpleLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/ApplicationUser/LoginPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ApplicationUser/ErrorNotFound.vue'),
  },
];

export default routes;
