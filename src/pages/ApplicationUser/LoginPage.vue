<template>
  <q-page
    class="window-height window-width row justify-center items-center bg-grey-2"
  >
    <div class="column">
      <div class="row">
        <q-card
          square
          class="q-pa-md q-ma-none no-shadow bg-grey-2"
          style="width: 400px"
        >
          <q-card-section class="q-mt-xl q-mb-md">
            <q-img src="~assets/logo.png" spinner-color="white" />
          </q-card-section>
          <q-card-section>
            <q-btn
              color="primary"
              unelevated
              label="Googleアカウントでログイン"
              class="no-shadow full-width"
              :loading="loading"
              @click="loginWithGoogle"
            >
            </q-btn>
          </q-card-section>
          <q-card-section class="q-pb-none">
            <q-separator></q-separator>
            <p class="q-my-md text-title" align="center">
              Googleアカウントをお持ちでない方はこちら<br />
              （ログイン用メールリンクが送信されます）
            </p>
            <form @submit.prevent="loginWithMailLink">
              <common-text-input
                :textInput="email"
                :textInputRef="emailRef"
                :text-input-dense="true"
                textInputIcon="email"
                :textRule="emailRule"
                textLabel="メールアドレス"
                @update="updateEmail"
                @updateRef="updateEmailRef"
              >
              </common-text-input>
              <q-btn
                color="secondary"
                unelevated
                label="メールリンクでログイン"
                class="no-shadow full-width text-black"
                type="submit"
                :loading="loading"
              >
              </q-btn>
            </form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import CommonTextInput from 'components/CommonTextInput.vue';
import { inputRequired, validEmail } from 'src/common/helper/ValidationHelper';
import { RefType } from 'src/@types/type';
import { useAuthStore } from 'stores/auth';
import { useNotificationStore } from 'src/stores/notification';

/*************************************
 * Form内コンポーネント制御
 *************************************/
const email = ref('');
const emailRef: RefType = ref(null);
const emailRule = [inputRequired, validEmail];
const updateEmail = (changedVal: string) => {
  email.value = changedVal;
};
const updateEmailRef = (updateRef: RefType) => {
  emailRef.value = updateRef;
};

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const loginWithGoogle = async () => {
  loading.value = !loading.value;
  try {
    await authStore.loginWithGoogle();
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ログイン失敗', error.message);
    }
  } finally {
    loading.value = !loading.value;
  }
};

const loginWithMailLink = async () => {
  emailRef.value.validate();
  if (emailRef.value.hasError) {
    return;
  }

  loading.value = !loading.value;
  try {
    await authStore.sendMailLink(email.value);
    notificationStore.show(
      'メールリンク送信完了',
      '記入いただいたメールアドレス宛にメールを送信しました。メール内のリンクをクリックしてログインしてください。この画面は閉じていただいて構いません。'
    );
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ログイン失敗', error.message);
    }
  } finally {
    loading.value = !loading.value;
  }
};

onMounted(async () => {
  // メールリンク経由でログイン画面が開かれた場合は、メールリンクの検証処理を呼び出す
  try {
    await authStore.verifyMailLink(window.location.href);
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ログイン失敗', error.message);
    }
  }
});
</script>
