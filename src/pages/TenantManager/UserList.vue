<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-toolbar class="bg-grey-4 q-mb-md">
        <q-toggle v-model="showAll" label="無効ユーザーも表示" />
        <q-space></q-space>
        <q-btn unelevated @click="$router.push('users/new')">
          <q-icon name="add" class="q-mb-xs"></q-icon>
          新規追加
        </q-btn>
      </q-toolbar>

      <!-- 分岐[if 件数 === 0] -->
      <q-banner v-if="users.length === 0" dense class="text-white bg-red">
        <template v-slot:avatar>
          <q-icon name="info" size="sm" color="white" />
        </template>
        該当するユーザーは存在しません
      </q-banner>

      <!-- 分岐[else] -->
      <div v-else v-for="user in users" :key="user.email" class="q-my-xs">
        <user-card :user="user"></user-card>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { db } from 'src/firebase';
import { FirebaseError } from 'firebase/app';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import UserCard from 'src/components/UserCard.vue';
import { User } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import { userConverter } from 'src/converters/user';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * 登録済みユーザー情報の取得
 *************************************/
const state = reactive({
  users: [] as User[],
});

const getUsers = async () => {
  try {
    state.users.length = 0;

    if (!authStore.currentTenantId) {
      notificationStore.show(
        'データ取得に失敗',
        '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
      );
      return;
    }

    const q = query(
      collection(db, 'tenants', authStore.currentTenantId, 'users'),
      orderBy('email', 'asc')
    ).withConverter(userConverter);

    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      state.users.push(data);
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show(
        'データ取得に失敗',
        `ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいてください。: ${error.code}`
      );
    }
  }
};

onMounted(async () => {
  await getUsers();
});

/*************************************
 * 表示情報の制御
 *************************************/
const showAll = ref(false);
const users = computed(() => {
  return state.users.filter((item) => showAll.value || item.isActive);
});
</script>
