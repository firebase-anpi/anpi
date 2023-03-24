<template>
  <q-card square @click="jumpToDetail" style="cursor: pointer">
    <q-item>
      <q-item-section>
        <q-item-label class="text-subtitle1">{{ user.name }}</q-item-label>
        <q-item-label caption align="left">
          <div class="row">
            <div class="col">
              {{ user.email }}
            </div>
            <div class="col-3">
              {{ user.location }}
            </div>
          </div>
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script setup lang="ts">
import { User } from 'src/@types/type';
import { useRouter } from 'vue-router';
const router = useRouter();

const props = defineProps<{
  user: User;
}>();

const jumpToDetail = () => {
  router.push(`/users/${props.user._id}/edit`);
};
</script>
