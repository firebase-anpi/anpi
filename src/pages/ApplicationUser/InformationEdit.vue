<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card flat bordered>
        <q-card-section class="q-mt-sm">
          <p class="text-h5" align="center">お知らせの情報更新</p>
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
                <q-item-label class="text-subtitle2">
                  添付ファイル（同名ファイルは上書きされます）
                </q-item-label>
                <q-item-label>
                  <q-file
                    filled
                    dense
                    bottom-slots
                    multiple
                    counter
                    v-model="attachmentFileObjects"
                    @update:model-value="uploadFiles"
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
                <q-item-label
                  v-if="uploadedFilepaths.length > 0"
                  class="text-subtitle2"
                >
                </q-item-label>
                <div class="q-pa-sm">
                  <q-chip
                    v-for="filepath in uploadedFilepaths"
                    :key="filepath"
                    flat
                    icon="attach_file"
                    square
                    removable
                    style="cursor: pointer"
                    @remove="removeFile(filepath)"
                  >
                    {{ filepath.split('/').pop() }}
                  </q-chip>
                </div>
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

    <q-dialog v-model="showDialog" position="bottom">
      <q-card style="width: 420px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-subtitle1">お知らせを更新しました</div>
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
import { onMounted, reactive, Ref, ref } from 'vue';
import CommonTextInput from 'src/components/CommonTextInput.vue';
import {
  inputRequired,
  charactorLimit,
} from 'src/common/helper/ValidationHelper';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage } from 'src/firebase';
import { FirebaseError } from 'firebase/app';
// Vueのref()と名称がかぶるため、別名としてstorageRefを付けてimportしている
import { deleteObject, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useNotificationStore } from 'src/stores/notification';
import { useAuthStore } from 'src/stores/auth';
import { useRoute } from 'vue-router';
import { userConverter } from 'src/converters/user';
import { informationConverter } from 'src/converters/information';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const route = useRoute();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const title = ref('');
const titleRef: RefType = ref(null);
const body = ref('');
const bodyRef: RefType = ref(null);
const isPublished = ref(false);
const attachmentFileObjects: Ref<File[]> = ref([]); // 新規添付ファイルのInputForm用
const uploadedFilepaths: Ref<string[]> = ref([]); // 既にBlobに登録済みのFilepath用

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
      const information = snapshot.data();
      title.value = information.title;
      body.value = information.body || '';
      isPublished.value = information.isPublished;
      uploadedFilepaths.value = information.attachedFiles;
      state.information = information;
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

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);
const showDialog = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const uploadFiles = () => {
  loading.value = !loading.value;

  const promiseArray = [];
  for (let index = 0; index < attachmentFileObjects.value.length; index++) {
    const file: File = attachmentFileObjects.value[index];
    const filepath = `tenants/${authStore.currentTenantId}/informations/${informationId}/${file.name}`;
    const ref = storageRef(storage, filepath);
    promiseArray.push(uploadBytes(ref, file));

    // 同名ファイルの場合はアップロード済みファイルのリストは更新しない
    const filePathIndex = uploadedFilepaths.value.findIndex(
      (current_filepath) => current_filepath === filepath
    );
    if (filePathIndex < 0) {
      uploadedFilepaths.value.push(filepath);
    }
  }

  return (
    Promise.all(promiseArray)
      // uploadBytesがすべて正常に完了してから
      .then(async () => {
        if (!informationId || !authStore.currentTenantId) {
          notificationStore.show(
            'ファイルアップロードに失敗',
            '画面リロード等の操作によりファイルアップロードに失敗な情報が失われました。ログアウトしてやり直してください。'
          );
          return;
        }

        // 添付ファイルのフィールドのみ即時更新
        // [Note] 配列内の要素の更新はarrayRemoveやarrayUnionなども利用可能
        // 今回は配列自体をまるっと差し替える方法を取っている
        const information = { ...state.information };
        information.attachedFiles = uploadedFilepaths.value;
        const ref = doc(
          db,
          'tenants',
          authStore.currentTenantId,
          'informations',
          informationId
        ).withConverter(informationConverter);
        await setDoc(ref, information, { merge: true });
      })
      .catch((error) => {
        notificationStore.show('ファイルアップロードに失敗', error);
      })
      .finally(() => {
        loading.value = !loading.value;
        attachmentFileObjects.value.length = 0;
      })
  );
};

const removeFile = async (filepath: string) => {
  if (!informationId || !authStore.currentTenantId) {
    notificationStore.show(
      '添付ファイルの削除に失敗',
      '画面リロード等の操作により添付ファイルの削除に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  loading.value = !loading.value;
  try {
    // Storage上からファイルを削除
    await deleteObject(storageRef(storage, filepath));

    const index = uploadedFilepaths.value.findIndex(
      (path) => path === filepath
    );
    uploadedFilepaths.value.splice(index, 1);

    const information = { ...state.information };
    information.attachedFiles = uploadedFilepaths.value;
    const ref = doc(
      db,
      'tenants',
      authStore.currentTenantId,
      'informations',
      informationId
    ).withConverter(informationConverter);
    await setDoc(ref, information, { merge: true });
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('添付ファイルの削除に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};

const validateForm = async () => {
  titleRef.value.validate();
  bodyRef.value.validate();

  if (titleRef.value.hasError || bodyRef.value.hasError) {
    return;
  }

  await updateInformation();
};

const updateInformation = async () => {
  if (
    !informationId ||
    !authStore.currentTenantId ||
    !authStore.currentUserId
  ) {
    notificationStore.show(
      'データ更新に失敗',
      '画面リロード等の操作によりデータ更新に必要な情報が失われました。ログアウトしてやり直してください。'
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

      const information = { ...state.information };
      information.title = title.value;
      information.body = body.value || '';
      information.publisherName = user.name;
      information.isPublished = isPublished.value;
      information.attachedFiles = uploadedFilepaths.value;

      const ref = doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'informations',
        informationId
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
      notificationStore.show('お知らせの更新に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};
</script>
