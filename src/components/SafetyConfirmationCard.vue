<template>
  <q-card>
    <q-item class="bg-secondary text-black">
      <q-item-section avatar>
        <q-avatar>
          <q-img
            :src="`/${safetyConfirmation.hazardType}.png`"
            spinner-color="white"
          />
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-h6">{{
          safetyConfirmation.title
        }}</q-item-label>
        <q-item-label caption align="right"
          >登録日 :
          {{
            date.formatDate(
              safetyConfirmation._createdAt?.toDate(),
              'YYYY/MM/DD'
            )
          }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-card-section class="q-pt-md">
      <div class="text-caption text-grey">
        {{ safetyConfirmation.body || '特記事項なし' }}
      </div>
    </q-card-section>
    <q-separator />
    <q-card-actions>
      <q-space></q-space>
      <q-chip flat icon="event" square>
        回答期限 : {{ safetyConfirmation.dueDate }}
      </q-chip>

      <!-- 分岐[if 操作者が管理者（アプリ管理者およびテナント管理者）の場合] -->
      <q-btn-group v-if="forAdmin" unelevated>
        <q-btn
          dense
          outline
          color="primary"
          @click="
            $router.push(
              `/safetyConfirmations/manage/${props.safetyConfirmation._id}`
            )
          "
        >
          回答一覧
        </q-btn>
        <q-btn
          dense
          color="primary"
          @click="
            $router.push(
              `/safetyConfirmations/manage/${props.safetyConfirmation._id}/edit`
            )
          "
        >
          編集
        </q-btn>
      </q-btn-group>

      <!-- 分岐[else] -->
      <q-btn-group v-else unelevated>
        <q-btn
          dense
          unelevated
          color="primary"
          @click="
            $router.push(
              `/safetyConfirmations/${props.safetyConfirmation._id}/answers/new`
            )
          "
        >
          回答する
        </q-btn>
      </q-btn-group>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { SafetyConfirmation } from 'src/@types/type';
import { date } from 'quasar';

const props = withDefaults(
  defineProps<{
    safetyConfirmation: SafetyConfirmation;
    forAdmin: boolean;
  }>(),
  {
    forAdmin: false,
  }
);
</script>
