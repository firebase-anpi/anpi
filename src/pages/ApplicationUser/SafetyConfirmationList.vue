<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <!-- 分岐[if 安否確認件数 === 0] -->
      <q-banner
        v-if="state.safetyConfirmations.length === 0"
        dense
        class="text-white bg-red"
      >
        <template v-slot:avatar>
          <q-icon name="info" size="sm" color="white" />
        </template>
        現在回答可能な安否確認はありません
      </q-banner>

      <!-- 分岐[else] -->
      <div
        v-else
        v-for="safetyConfirmation in state.safetyConfirmations"
        :key="safetyConfirmation.title"
        class="q-mb-lg"
      >
        <safety-confirmation-card
          :safety-confirmation="safetyConfirmation"
          :for-admin="false"
        >
        </safety-confirmation-card>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import SafetyConfirmationCard from 'src/components/SafetyConfirmationCard.vue';
import { SafetyConfirmation } from 'src/@types/type';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from 'src/firebase';
import { useNotificationStore } from 'src/stores/notification';
import { useAuthStore } from 'src/stores/auth';
import { safetyConfirmationConverter } from 'src/converters/safetyConfirmation';
import { date } from 'quasar';
import { FirebaseError } from 'firebase/app';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * 登録済み安否確認情報の取得
 *************************************/
const state = reactive({
  safetyConfirmations: [] as SafetyConfirmation[],
});

const getSafetyConfirmations = async () => {
  try {
    state.safetyConfirmations.length = 0;

    if (!authStore.currentTenantId) {
      notificationStore.show(
        'データ取得に失敗',
        '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
      );
      return;
    }

    const q = query(
      collection(
        db,
        'tenants',
        authStore.currentTenantId,
        'safetyConfirmations'
      ).withConverter(safetyConfirmationConverter),
      where('dueDate', '>=', date.formatDate(new Date(), 'YYYY/MM/DD')),
      orderBy('dueDate', 'asc')
    );

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
  await getSafetyConfirmations();
});
</script>
