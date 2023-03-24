<template>
  <router-view />

  <!-- 通知用共通Dialog -->
  <q-dialog v-model="notificationStore.showDialog" position="bottom" persistent>
    <q-card style="width: 420px">
      <q-card-section class="row items-center no-wrap">
        <div>
          <div class="text-weight-bold text-h6">
            {{ notificationStore.title }}
          </div>
          <div class="text-subtitle1">
            {{ notificationStore.body }}
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          unelevated
          label="OK"
          color="primary"
          class="text-white"
          @click="notificationStore.hide()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from 'src/firebase';
import { useRouter } from 'vue-router';
import { useNotificationStore } from './stores/notification';
import { useAuthStore } from './stores/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FirebaseError } from '@firebase/app';
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

// [Note] 画面遷移を繰り返す中でイベントハンドラが誤って複数回設定されないように、根元の要素であるApp.vueで設定しています
// 個別ページでonAuthStateChangedを設定する場合は、不要になったタイミングでイベントハンドラを忘れずに破棄してください
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!user.emailVerified) {
      notificationStore.show(
        '認証情報が不正',
        'ご登録いただいたメールアドレスには、本人確認がされていないためログアウトされました。'
      );
      await authStore.logout();
    }

    try {
      // カスタムクレームからテナントID取得
      const res = await user.getIdTokenResult();
      const currentTenantId = res.claims.currentTenantId;

      if (currentTenantId) {
        // Firestoreからロール情報を取得
        const snapshot = await getDoc(
          doc(db, 'tenantUsers', user.uid, 'tenants', currentTenantId)
        );
        const role = snapshot.data()?.role;

        if (role) {
          authStore.setUser(user, currentTenantId, role);
          router.push('/');
          return;
        }
      }

      // ログインしてきたユーザーが正規の登録をされていない場合
      // 今回の仕組みでは、カスタムクレーム および Firestoreに情報がないことで判定ができるのでログアウトさせる
      notificationStore.show(
        '認証情報が不正',
        'ユーザー登録がされていない または 無効なユーザーのため、認証トークンの情報が欠損しています。'
      );
      await authStore.logout();
    } catch (error) {
      if (error instanceof FirebaseError) {
        notificationStore.show(
          'サーバーとの通信異常',
          'ネットワークに問題がある可能性があります。一定時間をおいてから再度試してください。'
        );
        await authStore.logout();
      }
    }
  } else {
    authStore.clearUser();
    router.push('/login');
  }
});
</script>
