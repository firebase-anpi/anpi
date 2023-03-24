<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card flat bordered>
        <q-card-section class="q-mt-sm">
          <p class="text-h5" align="center">お知らせの新規登録</p>
          <div class="text-caption" align="center">
            必要事項を記入し、ページ下部のボタンを押してください
          </div>
        </q-card-section>
        <q-card-section>
          <form @submit.prevent="validateForm">
            <common-text-input
              :textInput="title"
              :textInputRef="titleRef"
              :text-input-dense="true"
              :textRule="[inputRequired, charactorLimit(25)]"
              text-hint="25文字以内"
              textLabel="タイトル"
              @update="(newVal) => (title = newVal)"
              @updateRef="(newRef) => (titleRef = newRef)"
            ></common-text-input>

            <common-text-input
              :textInput="body"
              :textInputRef="bodyRef"
              :text-input-dense="true"
              :textRule="[charactorLimit(400)]"
              textLabel="お知らせの本文（任意）"
              text-hint="400文字以内"
              text-type="textarea"
              @update="(newVal) => (body = newVal)"
              @updateRef="(newRef) => (bodyRef = newRef)"
            ></common-text-input>

            <q-item>
              <q-item-section>
                <q-item-label class="text-subtitle2">公開状態</q-item-label>
                <q-item-label>
                  <div class="q-gutter-sm">
                    <q-toggle
                      v-model="isPublished"
                      :label="
                        isPublished
                          ? '即時公開する'
                          : '下書き（非公開）として作成する'
                      "
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label class="text-subtitle2">添付ファイル</q-item-label>
                <q-item-label>
                  <q-file
                    filled
                    dense
                    bottom-slots
                    multiple
                    counter
                    v-model="attachmentFileObjects"
                  >
                    <template v-slot:prepend>
                      <q-icon name="cloud_upload" @click.stop.prevent />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        name="close"
                        @click.stop.prevent="attachmentFileObjects.length = 0"
                        class="cursor-pointer"
                      />
                    </template>
                  </q-file>
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
              @click="$router.push('/informations')"
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
            <div class="text-weight-bold text-h6">お知らせを登録しました</div>
            <div class="text-subtitle1">
              お知らせを編集する場合は、お知らせの一覧から当該お知らせを選択後、ページ上部の「編集」ボタンを押してください
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            label="OK"
            unelevated
            color="primary"
            @click="$router.push('/informations')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { Information, RefType } from 'src/@types/type';
import { onMounted, Ref, ref } from 'vue';
import CommonTextInput from 'src/components/CommonTextInput.vue';
import {
  inputRequired,
  charactorLimit,
} from 'src/common/helper/ValidationHelper';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage } from 'src/firebase';
import { useNotificationStore } from 'src/stores/notification';
import { useAuthStore } from 'src/stores/auth';
import { userConverter } from 'src/converters/user';
import { FirebaseError } from 'firebase/app';
import { informationConverter } from 'src/converters/information';
import { ref as storageRef, uploadBytes } from 'firebase/storage';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const title = ref('');
const titleRef: RefType = ref(null);
const body = ref('');
const bodyRef: RefType = ref(null);
const isPublished = ref(true);
const attachmentFileObjects: Ref<File[]> = ref([]);

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);
const showDialog = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const validateForm = async () => {
  titleRef.value.validate();
  bodyRef.value.validate();

  if (titleRef.value.hasError || bodyRef.value.hasError) {
    return;
  }

  if (await uploadFiles()) {
    await addInformation();
  }
};

const uploadFiles = (): Promise<boolean> => {
  const promiseArray = [];
  for (let index = 0; index < attachmentFileObjects.value.length; index++) {
    const file: File = attachmentFileObjects.value[index];

    // Vueのref()と名称がかぶるため、別名としてstorageRefを付けてimportしている
    const ref = storageRef(
      storage,
      `tenants/${authStore.currentTenantId}/informations/${informationDocumentId}/${file.name}`
    );
    promiseArray.push(uploadBytes(ref, file));
  }

  return Promise.all(promiseArray)
    .then(() => {
      return true;
    })
    .catch((error) => {
      notificationStore.show('ファイルのアップロードに失敗', error);
      return false;
    });
};

const addInformation = async () => {
  if (!authStore.currentTenantId || !authStore.currentUserId) {
    notificationStore.show(
      'データ登録に失敗',
      '画面リロード等の操作によりデータ登録に必要な情報が失われました。ログアウトしてやり直してください。'
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

      // 登録対象のinformationを生成
      const information: Information = {
        title: title.value,
        body: body.value || '',
        publisherName: user.name,
        isPublished: isPublished.value,
        attachedFiles: attachmentFileObjects.value.map((file) => {
          return `tenants/${authStore.currentTenantId}/informations/${informationDocumentId}/${file.name}`;
        }),
      };

      const ref = doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'informations',
        informationDocumentId
      ).withConverter(informationConverter);
      await setDoc(ref, information);
      showDialog.value = !showDialog.value;
    } else {
      notificationStore.show(
        'データ取得に失敗',
        'ユーザー情報が存在しません。'
      );
    }
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('お知らせの登録に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};

/*************************************
 * 初期処理
 *************************************/
let informationDocumentId: string;
onMounted(() => {
  if (!authStore.currentTenantId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  // [Note] Storageにファイルを保管する際に、Firestore側のDocumentIdと紐づける必要がある
  // そのため今回は、Firestoreにデータをセットする際に自動生成のIDを用いず、
  // 画面生成段階で、DocumentIdを事前に生成しておくこととする
  informationDocumentId = doc(
    collection(db, 'tenants', authStore.currentTenantId, 'informations')
  ).id;
});
</script>
