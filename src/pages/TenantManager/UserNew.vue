<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card flat bordered>
        <q-card-section class="q-mt-sm">
          <p class="text-h5" align="center">ユーザーの新規登録</p>
          <div class="text-caption" align="center">
            必要事項を記入し、ページ下部のボタンを押してください
          </div>
        </q-card-section>
        <q-card-section>
          <form @submit.prevent="validateForm">
            <common-text-input
              :textInput="userEmail"
              :textInputRef="userEmailRef"
              :text-input-dense="true"
              :textRule="[inputRequired, validEmail]"
              textLabel="メールアドレス"
              @update="(newVal) => (userEmail = newVal)"
              @updateRef="(newRef) => (userEmailRef = newRef)"
            ></common-text-input>

            <common-text-input
              :textInput="userName"
              :textInputRef="userNameRef"
              :text-input-dense="true"
              :textRule="[inputRequired]"
              textLabel="氏名"
              @update="(newVal) => (userName = newVal)"
              @updateRef="(newRef) => (userNameRef = newRef)"
            ></common-text-input>

            <q-item class="q-pa-none">
              <q-item-section>
                <q-item-label>
                  <q-select
                    dense
                    filled
                    v-model="userLocation"
                    :options="prefectures"
                    label="所在地"
                    class="q-mb-sm"
                  />
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-separator class="q-my-lg"></q-separator>

            <q-item class="q-mb-md q-pa-none">
              <q-item-section>
                <q-checkbox v-model="isActive" color="primary">
                  有効なユーザー（無効なユーザーは一切の操作ができません）
                </q-checkbox>
              </q-item-section>
            </q-item>

            <q-item class="q-mb-md" v-if="isActive">
              <q-item-section>
                <q-item-label class="text-subtitle2 q-mb-sm"
                  >権限ロール</q-item-label
                >
                <q-item-label>
                  <div class="q-gutter-md" tabindex="4">
                    <q-radio
                      dense
                      v-model="userRole"
                      val="applicationUser"
                      label="アプリ利用者"
                    />
                    <q-radio
                      dense
                      v-model="userRole"
                      val="applicationManager"
                      label="アプリ管理者"
                    />
                    <q-radio
                      dense
                      v-model="userRole"
                      val="tenantManager"
                      label="テナント管理者"
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-btn
              color="primary"
              unelevated
              label="上記の内容で登録する"
              class="no-shadow full-width"
              type="submit"
              :loading="loading"
            ></q-btn>
            <q-btn
              color="primary"
              outline
              unelevated
              label="一覧へ戻る"
              class="no-shadow full-width q-mt-md"
              @click="$router.push('/users')"
              :disable="loading"
            >
            </q-btn>
          </form>
        </q-card-section>
      </q-card>
    </q-card>

    <q-dialog v-model="showDialog" position="bottom" persistent>
      <q-card style="width: 420px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold text-h6">新規ユーザーを登録完了</div>
            <div class="text-subtitle1">
              ユーザーを編集する場合は、一覧画面でユーザーを選択してください
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            label="OK"
            unelevated
            color="primary"
            @click="$router.push('/users')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { functions } from 'src/firebase';
import { inputRequired, validEmail } from 'src/common/helper/ValidationHelper';
import CommonTextInput from 'src/components/CommonTextInput.vue';
import prefectures from 'src/common/constant/prefectures';
import { RefType, User } from 'src/@types/type';
import { useNotificationStore } from 'src/stores/notification';
import { httpsCallable } from 'firebase/functions';
const notificationStore = useNotificationStore();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const userEmail = ref('');
const userEmailRef: RefType = ref(null);
const userName = ref('');
const userNameRef: RefType = ref(null);
const userLocation = ref('東京都');
const isActive = ref(true);
const userRole = ref('applicationUser');

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);
const showDialog = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const validateForm = () => {
  userEmailRef.value.validate();
  userNameRef.value.validate();

  if (userEmailRef.value.hasError || userNameRef.value.hasError) {
    return;
  }

  addUser();
};

const createUserApi = httpsCallable(functions, 'tenant-createUser');

const addUser = async () => {
  const user: User = {
    name: userName.value,
    email: userEmail.value,
    location: userLocation.value,
    isActive: isActive.value,
  };

  loading.value = !loading.value;
  try {
    await createUserApi({
      user,
      role: userRole.value,
    });
    showDialog.value = !showDialog.value;
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ユーザー登録に失敗', error.message);
    }
  } finally {
    loading.value = !loading.value;
  }
};
</script>
