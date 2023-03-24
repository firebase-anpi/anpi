<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title> anpi! </q-toolbar-title>

        <q-btn
          flat
          round
          dense
          icon="assignment_ind"
          class="q-ml-sm"
          @click="router.push('/profile')"
        ></q-btn>
        <q-btn
          flat
          round
          dense
          icon="logout"
          class="q-ml-sm"
          @click="authStore.logout()"
        ></q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> 標準機能 </q-item-label>
        <EssentialLink
          v-for="link in appUserMenus"
          :key="link.title"
          v-bind="link"
        />
      </q-list>

      <q-separator class="q-my-md"></q-separator>

      <q-list>
        <q-item-label header> アプリ管理者向け機能 </q-item-label>
        <EssentialLink
          v-for="link in appAdminMenus"
          :key="link.title"
          v-bind="link"
        />
      </q-list>

      <q-separator class="q-my-md"></q-separator>

      <q-list>
        <q-item-label header> テナント管理者向け機能 </q-item-label>
        <EssentialLink
          v-for="link in tenantAdminMenus"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container class="row justify-center bg-grey-2">
      <router-view
        :style="$q.screen.width > 600 ? 'width: 60%;' : 'width: 100%;'"
      />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink, {
  EssentialLinkProps,
} from 'components/EssentialLink.vue';

import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
const router = useRouter();
const authStore = useAuthStore();

const appUserMenus: EssentialLinkProps[] = [
  {
    title: '安否確認回答',
    caption: 'ご自身の安否報告はこちらから',
    icon: 'edit',
    link: '/safetyConfirmations',
  },
  {
    title: 'お知らせ',
    caption: '重要な共有事項が掲載されます',
    icon: 'assignment',
    link: '/informations',
  },
  {
    title: 'メッセージ',
    caption: 'チャット形式で連絡が取れます',
    icon: 'chat',
    link: '/messages',
  },
];

const appAdminMenus: EssentialLinkProps[] = [
  {
    title: '安否確認管理',
    caption: '安否確認を新たに開始 または みなさんの回答状況を確認できます',
    icon: 'format_list_bulleted',
    link: '/safetyConfirmations/manage',
  },
];

const tenantAdminMenus: EssentialLinkProps[] = [
  {
    title: 'ユーザー管理',
    caption: 'ユーザー追加や権限の修正ができます',
    icon: 'group',
    link: '/users',
  },
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
