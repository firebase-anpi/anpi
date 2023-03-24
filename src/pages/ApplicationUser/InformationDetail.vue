<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-toolbar class="bg-grey-4 q-mb-md">
        <q-btn
          dense
          icon="arrow_back"
          unelevated
          @click="$router.push('/informations')"
        ></q-btn>
        <q-space></q-space>
        <q-btn
          icon="edit"
          label="お知らせの編集"
          unelevated
          @click="$router.push(`/informations/${informationId}/edit`)"
        >
        </q-btn>
      </q-toolbar>

      <q-card flat>
        <q-item class="q-mb-md">
          <q-item-section>
            <q-item-label class="text-subtitle1">{{
              state.information?.title
            }}</q-item-label>
            <q-item-label caption align="right">
              {{
                date.formatDate(
                  state.information?._updatedAt?.toDate(),
                  'YYYY/MM/DD'
                )
              }}
              公開 by
              {{ state.information?.publisherName }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item class="q-mb-md">
          {{ state.information?.body }}
        </q-item>

        <q-separator></q-separator>

        <div class="q-pa-sm">
          <q-chip
            v-for="filepath in state.information?.attachedFiles"
            :key="filepath"
            flat
            icon="attach_file"
            square
            style="cursor: pointer"
            clickable
            @click="downloadFile(filepath)"
          >
            {{ filepath.split('/').pop() }}
          </q-chip>
        </div>
      </q-card>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from 'src/firebase';
import { FirebaseError } from 'firebase/app';
import { date } from 'quasar';
import { Information } from 'src/@types/type';
import { informationConverter } from 'src/converters/information';
import { useNotificationStore } from 'src/stores/notification';
import { useAuthStore } from 'src/stores/auth';
import { useRoute } from 'vue-router';
import { getBlob, ref } from 'firebase/storage';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const route = useRoute();

const state = reactive({
  information: null as Information | null,
});

const informationId =
  typeof route.params.id === 'string' ? route.params.id : undefined;

onMounted(async () => {
  if (!informationId || !authStore.currentTenantId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  // 登録済みのお知らせを取得
  try {
    const snapshot = await getDoc(
      doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'informations',
        informationId
      ).withConverter(informationConverter)
    );

    if (snapshot.exists()) {
      state.information = snapshot.data();
    } else {
      notificationStore.show(
        'データ取得に失敗',
        '対象のデータが存在しません。'
      );
    }
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show(
        'データ取得に失敗',
        `ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいてください。: ${error.code}`
      );
    }
  }
});

const downloadFile = async (filepath: string) => {
  try {
    //StorageからBlobとして取得
    const blob = await getBlob(ref(storage, filepath));

    // ブラウザにダウンロードとして認識させるための小細工
    const url = (window.URL || window.webkitURL).createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filepath.split('/').pop() || 'ファイル名不詳';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ファイルダウンロードに失敗', error.message);
    }
  }
};
</script>
