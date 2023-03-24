<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card flat bordered>
        <q-card-section class="q-mt-sm">
          <p class="text-h5" align="center">ユーザー情報の更新</p>
          <div class="text-caption" align="center">
            必要事項を記入し、ページ下部のボタンを押してください
          </div>
        </q-card-section>
        <q-card-section>
          <form @submit.prevent="validateForm">
            <q-item class="q-px-sm q-mb-md">
              <q-item-section>
                <q-item-label caption>メールアドレス</q-item-label>
                <q-item-label>
                  {{ userEmail }}
                </q-item-label>
              </q-item-section>
            </q-item>

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
              label="上記の内容で更新する"
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
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { db, functions } from 'src/firebase';
import { inputRequired } from 'src/common/helper/ValidationHelper';
import CommonTextInput from 'src/components/CommonTextInput.vue';
import prefectures from 'src/common/constant/prefectures';
import { RefType, User } from 'src/@types/type';
import { useNotificationStore } from 'src/stores/notification';
import { httpsCallable } from 'firebase/functions';
import { useRoute } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { doc, getDoc } from 'firebase/firestore';
import { userConverter } from 'src/converters/user';
import { tenantUserConverter } from 'src/converters/tenantUser';
import { FirebaseError } from '@firebase/app';
const route = useRoute();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const userEmail = ref('');
const userName = ref('');
const userNameRef: RefType = ref(null);
const userLocation = ref('東京都');
const isActive = ref(true);
const userRole = ref('applicationUser');

onMounted(async () => {
  const userId =
    typeof route.params.id === 'string' ? route.params.id : undefined;

  if (!userId || !authStore.currentTenantId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  // ユーザー情報をusersから取得
  try {
    const userSnapshot = await getDoc(
      doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'users',
        userId
      ).withConverter(userConverter)
    );
    if (userSnapshot.exists()) {
      const user = userSnapshot.data();
      userEmail.value = user.email;
      userName.value = user.name;
      userLocation.value = user.location;
      isActive.value = user.isActive;

      // ロール情報をtenantUsersから取得
      const tenantUserSnapshot = await getDoc(
        doc(
          db,
          'tenantUsers',
          userId,
          'tenants',
          authStore.currentTenantId
        ).withConverter(tenantUserConverter)
      );
      if (tenantUserSnapshot.exists()) {
        const tenantUser = tenantUserSnapshot.data();
        if (tenantUser.role) {
          userRole.value = tenantUser.role;
          return;
        }
      }
    } else {
      notificationStore.show(
        'データ取得に失敗',
        'ユーザー情報が存在しません。'
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

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const validateForm = () => {
  userNameRef.value.validate();
  if (userNameRef.value.hasError) {
    return;
  }

  updateUser();
};

const updateUserApi = httpsCallable(functions, 'tenant-updateUser');

const updateUser = async () => {
  const uid = typeof route.params.id === 'string' ? route.params.id : undefined;
  const user: User = {
    _id: uid,
    name: userName.value,
    email: userEmail.value,
    location: userLocation.value,
    isActive: isActive.value,
  };

  loading.value = !loading.value;
  try {
    await updateUserApi({
      user,
      role: userRole.value,
    });
    notificationStore.show(
      'ユーザー情報の更新完了',
      '正常にユーザー情報・権限ロール設定を更新しました。'
    );
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('ユーザー更新に失敗', error.message);
    }
  } finally {
    loading.value = !loading.value;
  }
};
</script>
