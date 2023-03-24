<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-toolbar class="bg-grey-4 q-mb-md">
        <q-toggle
          v-model="showAll"
          label="未公開も表示"
          @update:model-value="toggleShowAll"
        />
        <q-space></q-space>
        <q-btn unelevated @click="$router.push('informations/new')">
          <q-icon name="add" class="q-mb-xs"></q-icon>
          新規追加
        </q-btn>
      </q-toolbar>

      <!-- 分岐[if 件数 === 0] -->
      <q-banner
        v-if="state.informations.length === 0"
        dense
        class="text-white bg-red"
      >
        <template v-slot:avatar>
          <q-icon name="info" size="sm" color="white" />
        </template>
        現在掲載されているお知らせはありません
      </q-banner>

      <!-- 分岐[else] -->
      <div
        v-else
        v-for="information in state.informations"
        :key="information.title"
        class="q-my-xs"
      >
        <information-card :information="information"></information-card>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { FirebaseError } from 'firebase/app';
import { db } from 'src/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Information } from 'src/@types/type';
import InformationCard from 'src/components/InformationCard.vue';
import { informationConverter } from 'src/converters/information';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * 登録済みお知らせ情報の取得
 *************************************/
const state = reactive({
  informations: [] as Information[],
});

const getInformations = async (showAll: boolean) => {
  try {
    state.informations.length = 0;

    if (!authStore.currentTenantId) {
      notificationStore.show(
        'データ取得に失敗',
        '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
      );
      return;
    }

    let q = null;
    if (showAll) {
      q = query(
        collection(
          db,
          'tenants',
          authStore.currentTenantId,
          'informations'
        ).withConverter(informationConverter),
        orderBy('_updatedAt', 'desc')
      );
    } else {
      q = query(
        collection(
          db,
          'tenants',
          authStore.currentTenantId,
          'informations'
        ).withConverter(informationConverter),
        where('isPublished', '==', true),
        orderBy('_updatedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      state.informations.push(data);
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === 'permission-denied') {
        notificationStore.show(
          'データ取得に失敗',
          'この機能を利用するためには、アプリ管理者かテナント管理者のロールが必要です。'
        );
      } else {
        notificationStore.show(
          'データ取得に失敗',
          `ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいてください。: ${error.code}`
        );
        console.log(error);
      }
    }
  }
};

onMounted(async () => {
  await getInformations(showAll.value);
});

/*************************************
 * 表示情報の制御
 *************************************/
const showAll = ref(false);
const toggleShowAll = async () => {
  await getInformations(showAll.value);
};
</script>
