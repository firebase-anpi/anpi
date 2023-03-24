<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-toolbar class="bg-grey-4">
        <q-btn
          dense
          icon="arrow_back"
          unelevated
          @click="$router.push('/safetyConfirmations/manage')"
        ></q-btn>
        <q-space></q-space>
        <q-btn
          icon="edit"
          label="安否確認の編集"
          unelevated
          @click="
            $router.push(
              `/safetyConfirmations/manage/${safetyConfirmationId}/edit`
            )
          "
        >
        </q-btn>
      </q-toolbar>

      <q-card
        square
        class="q-my-xs"
        v-for="answer in state.answers"
        :key="answer._id"
      >
        <q-item>
          <q-item-section>
            <q-item-label class="text-subtitle1">
              <q-chip
                square
                dense
                v-if="answer.safetyStatus !== undefined"
                :color="
                  answer.safetyStatus === '安全'
                    ? 'teal'
                    : answer.safetyStatus === '軽傷'
                    ? 'orange'
                    : 'red'
                "
                text-color="white"
              >
                {{ answer.safetyStatus }}
              </q-chip>
              <q-chip square dense v-else color="grey" text-color="white">
                未回答
              </q-chip>
              {{ answer.nameSnapshot }}
            </q-item-label>
            <q-item-label class="text-body2">
              {{ answer.memo }}
            </q-item-label>
            <q-item-label
              v-if="!!answer.locationSnapshot"
              caption
              align="right"
            >
              {{ date.formatDate(answer._updatedAt?.toDate(), 'YYYY/MM/DD') }} @
              {{ answer.locationSnapshot }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-card>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { FirebaseError } from 'firebase/app';
import { date } from 'quasar';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { SafetyConfirmationAnswer } from 'src/@types/type';
import { safetyConfirmationAnswerConverter } from 'src/converters/safetyConfirmationAnswer';
import { userConverter } from 'src/converters/user';
import { db } from 'src/firebase';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import { useRoute } from 'vue-router';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const route = useRoute();

const safetyConfirmationId =
  typeof route.params.id === 'string' ? route.params.id : undefined;

/*************************************
 * 登録済み安否確認回答の取得
 *************************************/
const state = reactive({
  answers: [] as SafetyConfirmationAnswer[],
});

const getAnswers = async () => {
  state.answers.length = 0;

  if (!safetyConfirmationId || !authStore.currentTenantId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  try {
    // users一覧を取得
    const userQuery = query(
      collection(
        db,
        'tenants',
        authStore.currentTenantId,
        'users'
      ).withConverter(userConverter),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    const userSnapshot = await getDocs(userQuery);
    const users = userSnapshot.docs.map((doc) => doc.data());

    // answers一覧を取得
    const answerQuery = query(
      collection(
        db,
        'tenants',
        authStore.currentTenantId,
        'safetyConfirmations',
        safetyConfirmationId,
        'answers'
      ).withConverter(safetyConfirmationAnswerConverter)
    );
    const answersSnapshot = await getDocs(answerQuery);
    const answers = answersSnapshot.docs.map((doc) => doc.data());

    // クライアントサイドJOIN（未回答の人の枠を作成するため）
    state.answers = users.map((user) => {
      const index = answers.findIndex((answer) => answer._id === user._id);
      if (index >= 0) {
        return answers[index];
      } else {
        return {
          safetyStatus: undefined,
          memo: undefined,
          nameSnapshot: user.name,
          locationSnapshot: user.location,
        };
      }
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show(
        'データ取得に失敗',
        `ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいてください。: ${error.code}`
      );
    } else {
      console.log(error);
    }
  }
};

onMounted(async () => {
  await getAnswers();
});
</script>
