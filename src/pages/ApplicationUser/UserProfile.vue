<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-toolbar class="bg-grey-4 q-mb-md">
        <q-toolbar-title class="text-h6">ユーザープロフィール</q-toolbar-title>
      </q-toolbar>

      <q-card-section class="q-mt-sm" align="center">
        <form @submit.prevent="validateForm">
          <q-avatar
            size="80px"
            font-size="52px"
            color="primary"
            text-color="white"
            icon="person"
          />
          <p class="text-subtitle1 q-mt-md">
            {{ authStore.currentUser?.email }}
          </p>

          <q-input
            dense
            square
            filled
            v-model="userName"
            ref="userNameRef"
            :rules="[inputRequired]"
            class="q-mb-sm"
            label="氏名"
          >
          </q-input>
          <q-select
            dense
            filled
            v-model="userLocation"
            ref="userLocationRef"
            :options="prefectures"
            :rules="[inputRequired]"
            label="所在地"
            class="q-mb-sm"
          />
          <q-btn
            color="primary"
            unelevated
            label="プロフィールを更新する"
            class="no-shadow full-width"
            type="submit"
            :loading="loading"
          ></q-btn>
        </form>
      </q-card-section>

      <q-separator class="q-my-md"></q-separator>

      <q-card-section class="q-mt-sm">
        <q-item-label caption>現在のロール</q-item-label>
        <p>
          {{ authStore.role }}
        </p>
        <q-item-label caption>現在のテナント</q-item-label>
        <p>
          {{ authStore.currentTenantId }}
        </p>
        <div v-if="state.availableTenants.length > 0">
          <q-select
            dense
            filled
            v-model="switchTargetTenantId"
            :options="state.availableTenants"
            option-value="id"
            label="切り替え可能なテナント"
            class="q-mb-sm"
          />
          <q-btn
            color="primary"
            unelevated
            label="上記テナントに切り替える"
            class="no-shadow full-width"
            :loading="loading"
            @click="switchTenant"
          >
          </q-btn>
        </div>
        <div v-else>
          <q-banner dense class="text-white bg-grey">
            <template v-slot:avatar>
              <q-icon name="info" size="sm" color="white" />
            </template>
            切り替え可能なテナントはありません
          </q-banner>
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showDialog" position="bottom" persistent>
      <q-card style="width: 420px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold text-h6">
              ユーザープロフィールを更新しました
            </div>
            <div class="text-subtitle1">
              引き続き利用するためには、再度ログインしてください
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            label="OK"
            unelevated
            color="primary"
            @click="authStore.logout()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
} from 'firebase/firestore';
import { db, functions } from 'src/firebase';
import { useAuthStore } from 'src/stores/auth';
import { onMounted, reactive, ref } from 'vue';
import prefectures from 'src/common/constant/prefectures';
import { httpsCallable } from 'firebase/functions';
import { useNotificationStore } from 'src/stores/notification';
import { FirebaseError } from '@firebase/app';
import { RefType, User } from 'src/@types/type';
import { userConverter } from 'src/converters/user';
import { tenantUserConverter } from 'src/converters/tenantUser';
import { inputRequired } from 'src/common/helper/ValidationHelper';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const userName = ref('');
const userNameRef: RefType = ref(null);
const userLocation = ref('');
const userLocationRef: RefType = ref(null);

const switchTargetTenantId = ref('');
const state = reactive({
  availableTenants: [] as string[],
  user: null as User | null,
});

onMounted(async () => {
  if (!authStore.currentTenantId || !authStore.currentUserId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  try {
    // ユーザー情報取得
    const userSnapshot = await getDoc(
      doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'users',
        authStore.currentUserId
      ).withConverter(userConverter)
    );
    if (userSnapshot.exists()) {
      const user = userSnapshot.data();
      userName.value = user.name;
      userLocation.value = user.location;
      state.user = user;

      // 切替可能なテナント一覧の取得
      const q = query(
        collection(
          db,
          'tenantUsers',
          authStore.currentUserId,
          'tenants'
        ).withConverter(tenantUserConverter)
      );
      const tenantUsersSnapshot = await getDocs(q);
      tenantUsersSnapshot.docs.forEach((doc) => {
        const tenantId = doc.id;
        if (tenantId !== authStore.currentTenantId) {
          state.availableTenants.push(doc.id);
        }
      });
    } else {
      notificationStore.show(
        'データ取得に失敗',
        'ユーザー情報が存在しません。'
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      notificationStore.show('データ取得に失敗', error.message);
    }
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
  userNameRef.value.validate();
  userLocationRef.value.validate();
  if (userNameRef.value.hasError || userLocationRef.value.hasError) {
    return;
  }

  updateUser();
};

const updateUser = async () => {
  if (!authStore.currentTenantId || !authStore.currentUserId) {
    notificationStore.show(
      'データ更新に失敗',
      '画面リロード等の操作によりデータ更新に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  loading.value = !loading.value;
  try {
    const user = { ...state.user };
    user.name = userName.value;
    user.location = userLocation.value;

    const ref = doc(
      db,
      'tenants',
      authStore.currentTenantId,
      'users',
      authStore.currentUserId
    ).withConverter(userConverter);
    await setDoc(ref, user, { merge: true });
    notificationStore.show(
      'ユーザープロフィールの更新完了',
      '正常にユーザープロフィールを更新しました。'
    );
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('ユーザー更新に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};

const switchTenant = async () => {
  if (!!switchTargetTenantId.value) {
    loading.value = !loading.value;
    try {
      const switchTenantApi = httpsCallable(functions, 'tenant-switchTenant');
      await switchTenantApi({
        switchTargetTenantId: switchTargetTenantId.value,
      });
      showDialog.value = !showDialog.value;
    } catch (error) {
      if (error instanceof FirebaseError) {
        notificationStore.show('テナント切替失敗', error.message);
      }
    } finally {
      loading.value = !loading.value;
    }
  }
};
</script>
