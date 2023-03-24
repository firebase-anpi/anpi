<template>
  <q-page class="row items-center justify-evenly bg-grey-2">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card-section>
        <form @submit.prevent="validateForm">
          <p class="text-h6" align="center">最新の安否状況を教えてください</p>
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label caption>質問 1. あなたの安否</q-item-label>
                <q-item-label>
                  <div class="q-gutter-sm">
                    <q-radio
                      v-model="safetyStatus"
                      val="安全"
                      label="安全"
                      color="teal"
                    />
                    <q-radio
                      v-model="safetyStatus"
                      val="軽傷"
                      label="軽傷"
                      color="orange"
                    />
                    <q-radio
                      v-model="safetyStatus"
                      val="重傷"
                      label="重傷"
                      color="red"
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label caption
                  >質問 2. 安否に関する簡単な連絡事項</q-item-label
                >
                <q-item-label>
                  <q-input
                    dense
                    filled
                    v-model="memo"
                    ref="memoRef"
                    :rules="[charactorLimit(30)]"
                    hint="30文字以内（任意）"
                  />
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-btn
                type="submit"
                color="primary"
                unelevated
                label="上記内容で回答する"
                class="no-shadow full-width"
              ></q-btn>
            </q-item>
          </q-list>
        </form>
      </q-card-section>

      <q-dialog v-model="showDialog" position="bottom" persistent>
        <q-card style="width: 420px">
          <q-card-section class="row items-center no-wrap">
            <div>
              <div class="text-weight-bold text-h6">安否確認に回答しました</div>
              <div class="text-subtitle1">
                引き続き身の安全の確保に務めてください。<br />
                状況に変化があった場合は、改めて本画面より状況を投稿してください。
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              label="OK"
              unelevated
              color="primary"
              @click="$router.push('/safetyConfirmations')"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RefType, SafetyConfirmationAnswer } from 'src/@types/type';
import { safetyConfirmationAnswerConverter } from 'src/converters/safetyConfirmationAnswer';
import { charactorLimit } from 'src/common/helper/ValidationHelper';
import { userConverter } from 'src/converters/user';
import { db } from 'src/firebase';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const route = useRoute();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const safetyStatus = ref<SafetyConfirmationAnswer['safetyStatus']>('安全');
const memo = ref('');
const memoRef: RefType = ref(null);

const safetyConfirmationId =
  typeof route.params.id === 'string' ? route.params.id : undefined;

/*************************************
 * 登録済み安否確認回答の取得
 *************************************/
const state = reactive({
  safetyConfirmationAnswer: {} as SafetyConfirmationAnswer,
});

onMounted(async () => {
  if (
    !safetyConfirmationId ||
    !authStore.currentTenantId ||
    !authStore.currentUserId
  ) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  // 登録済みの回答があれば取得
  const answerSnapshot = await getDoc(
    doc(
      db,
      'tenants',
      authStore.currentTenantId,
      'safetyConfirmations',
      safetyConfirmationId,
      'answers',
      authStore.currentUserId
    ).withConverter(safetyConfirmationAnswerConverter)
  );

  if (answerSnapshot.exists()) {
    const answer = answerSnapshot.data();
    safetyStatus.value = answer.safetyStatus;
    memo.value = answer.memo || '';
    state.safetyConfirmationAnswer = answer;
  }
});

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);
const showDialog = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const validateForm = () => {
  memoRef.value.validate();
  if (memoRef.value.hasError) {
    return;
  }

  addSafetyConfirmationAnswer();
};

const addSafetyConfirmationAnswer = async () => {
  if (
    !safetyConfirmationId ||
    !authStore.currentTenantId ||
    !authStore.currentUserId
  ) {
    notificationStore.show(
      'データ追加に失敗',
      '画面リロード等の操作によりデータ追加に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  loading.value = !loading.value;
  try {
    // ユーザー情報の取得
    const snapshot = await getDoc(
      doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'users',
        authStore.currentUserId
      ).withConverter(userConverter)
    );

    if (snapshot.exists()) {
      const user = snapshot.data();

      // 登録対象のobjectを生成
      const answer = { ...state.safetyConfirmationAnswer };
      answer.safetyStatus = safetyStatus.value;
      answer.memo = memo.value;
      answer.nameSnapshot = user.name;
      answer.locationSnapshot = user.location;

      // Functionsを介さず、Firestoreを直接操作する
      const ref = doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'safetyConfirmations',
        safetyConfirmationId,
        'answers',
        authStore.currentUserId
      ).withConverter(safetyConfirmationAnswerConverter);
      await setDoc(ref, answer, { merge: true });

      showDialog.value = !showDialog.value;
    } else {
      notificationStore.show(
        'データ追加に失敗',
        'ユーザー情報が存在しません。'
      );
    }
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('安否確認の回答に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};
</script>
