<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-card flat bordered>
        <q-card-section class="q-mt-sm">
          <p class="text-h5" align="center">安否確認の新規登録</p>
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
              :textRule="[charactorLimit(150)]"
              textLabel="安否確認の依頼文"
              text-hint="150文字以内（任意）"
              text-type="textarea"
              @update="(newVal) => (body = newVal)"
              @updateRef="(newRef) => (bodyRef = newRef)"
            ></common-text-input>

            <q-item>
              <q-item-section>
                <q-item-label class="text-subtitle2">災害種別</q-item-label>
                <q-item-label>
                  <div class="q-gutter-sm">
                    <q-radio
                      v-model="hazardType"
                      val="hazard_quake"
                      label="地震"
                    />
                    <q-radio
                      v-model="hazardType"
                      val="hazard_water"
                      label="風水害"
                    />
                    <q-radio
                      v-model="hazardType"
                      val="hazard_other"
                      label="その他"
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item class="q-pa-none">
              <q-item-section>
                <q-item-label>
                  <q-input
                    dense
                    filled
                    hide-bottom-space
                    v-model="dueDate"
                    label="回答期限"
                    mask="date"
                    readonly
                    :rules="['date']"
                    @focus="showCalendar = true"
                  >
                    <q-popup-proxy
                      v-model="showCalendar"
                      cover
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-date v-model="dueDate" minimal>
                        <div class="row items-center justify-end">
                          <q-btn
                            v-close-popup
                            label="OK"
                            color="primary"
                            flat
                          />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-input>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-btn
              color="primary"
              unelevated
              label="上記の内容で登録する"
              class="no-shadow full-width q-mt-md"
              type="submit"
              :loading="loading"
            ></q-btn>
            <q-btn
              color="primary"
              outline
              unelevated
              label="一覧へ戻る"
              class="no-shadow full-width q-mt-md"
              @click="$router.push('/safetyConfirmations/manage')"
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
            <div class="text-weight-bold text-h6">安否確認を登録しました</div>
            <div class="text-subtitle1">
              安否確認を編集する場合は、一覧から選択後にページ上部の「編集」ボタンを押してください
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            label="OK"
            unelevated
            color="primary"
            @click="$router.push('/safetyConfirmations/manage')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { Ref, ref } from 'vue';
import CommonTextInput from 'src/components/CommonTextInput.vue';
import {
  inputRequired,
  charactorLimit,
} from 'src/common/helper/ValidationHelper';
import { RefType, SafetyConfirmation } from 'src/@types/type';
import { date } from 'quasar';
import { addDoc, collection } from 'firebase/firestore';
import { db } from 'src/firebase';
import { useAuthStore } from 'src/stores/auth';
import { useNotificationStore } from 'src/stores/notification';
import { safetyConfirmationConverter } from 'src/converters/safetyConfirmation';
import { FirebaseError } from 'firebase/app';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * Form内コンポーネント制御
 *************************************/
const title = ref('');
const titleRef: RefType = ref(null);
const body = ref('');
const bodyRef: RefType = ref(null);
const hazardType: Ref<SafetyConfirmation['hazardType']> = ref('hazard_other');

// 回答期限（デフォルト1か月）
const dueDate = ref(
  date.formatDate(date.addToDate(new Date(), { months: 1 }), 'YYYY/MM/DD')
);

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);
const showCalendar = ref(false);
const showDialog = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
const validateForm = () => {
  titleRef.value.validate();
  bodyRef.value.validate();

  if (titleRef.value.hasError || bodyRef.value.hasError) {
    return;
  }

  addSafetyConfirmation();
};

const addSafetyConfirmation = async () => {
  const safetyConfirmation: SafetyConfirmation = {
    title: title.value,
    body: body.value || '',
    hazardType: hazardType.value,
    dueDate: dueDate.value,
  };

  if (!authStore.currentTenantId) {
    notificationStore.show(
      'データ登録に失敗',
      '画面リロード等の操作によりデータ登録に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  loading.value = !loading.value;
  try {
    const ref = collection(
      db,
      'tenants',
      authStore.currentTenantId,
      'safetyConfirmations'
    ).withConverter(safetyConfirmationConverter);
    await addDoc(ref, safetyConfirmation);
    showDialog.value = !showDialog.value;
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('安否確認の登録に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};
</script>
