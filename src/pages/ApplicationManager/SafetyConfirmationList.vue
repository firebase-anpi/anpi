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
          label="期限切れも表示"
          @update:model-value="toggleShowAll"
        />
        <q-space></q-space>
        <q-btn
          unelevated
          @click="$router.push('/safetyConfirmations/manage/new')"
        >
          <q-icon name="add" class="q-mb-xs"></q-icon>
          新規追加
        </q-btn>
      </q-toolbar>

      <!-- 分岐[if 件数 === 0] -->
      <q-banner
        v-if="state.safetyConfirmations.length === 0"
        dense
        class="text-white bg-red"
      >
        <template v-slot:avatar>
          <q-icon name="info" size="sm" color="white" />
        </template>
        該当する安否確認はありません
      </q-banner>

      <!-- 分岐[else] -->
      <div
        v-else
        class="q-mb-lg"
        v-for="safetyConfirmation in state.safetyConfirmations"
        :key="safetyConfirmation.title"
      >
        <safety-confirmation-card
          :safety-confirmation="safetyConfirmation"
          v-bind:for-admin="true"
        >
        </safety-confirmation-card>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { date } from 'quasar';
import { FirebaseError } from 'firebase/app';
import { db } from 'src/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { SafetyConfirmation } from 'src/@types/type';
import SafetyConfirmationCard from 'src/components/SafetyConfirmationCard.vue';
import { safetyConfirmationConverter } from 'src/converters/safetyConfirmation';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * 登録済み安否確認情報の取得
 *************************************/
const state = reactive({
  safetyConfirmations: [] as SafetyConfirmation[],
});

const getSafetyConfirmations = async (showAll: boolean) => {
  try {
    state.safetyConfirmations.length = 0;

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
          'safetyConfirmations'
        ).withConverter(safetyConfirmationConverter),
        orderBy('dueDate', 'asc')
      );
    } else {
      q = query(
        collection(
          db,
          'tenants',
          authStore.currentTenantId,
          'safetyConfirmations'
        ).withConverter(safetyConfirmationConverter),
        where('dueDate', '>=', date.formatDate(new Date(), 'YYYY/MM/DD')),
        orderBy('dueDate', 'asc')
      );
    }

    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      state.safetyConfirmations.push(data);
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
  await getSafetyConfirmations(showAll.value);
});

/*************************************
 * 表示情報の制御
 *************************************/
const showAll = ref(false);
const toggleShowAll = async () => {
  await getSafetyConfirmations(showAll.value);
};
</script>
