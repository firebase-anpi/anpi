<template>
  <q-card square @click="jumpToDetail" style="cursor: pointer">
    <q-item>
      <q-item-section>
        <q-item-label class="text-subtitle1">{{
          information.title
        }}</q-item-label>
        <q-item-label caption align="right">
          更新日 :
          {{ date.formatDate(information._updatedAt?.toDate(), 'YYYY/MM/DD') }}
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Information } from 'src/@types/type';
import { date } from 'quasar';
const router = useRouter();

const props = defineProps<{
  information: Information;
}>();

const jumpToDetail = () => {
  router.push(`/informations/${props.information._id}`);
};
</script>
