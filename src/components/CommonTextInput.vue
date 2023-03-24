<template>
  <q-item class="q-pa-none">
    <q-item-section>
      <q-item-label caption>{{ props.textInputCaption }}</q-item-label>
      <q-item-label>
        <q-input
          :dense="props.textInputDense"
          square
          filled
          v-model="input"
          color="black"
          class="full-width q-mb-sm"
          :rules="props.textRule"
          :hint="props.textHint"
          ref="inputRef"
          :label="props.textLabel"
          :type="props.textType"
        >
          <template v-if="props.textInputIcon != undefined" v-slot:prepend>
            <q-icon :name="props.textInputIcon" />
          </template>
        </q-input>
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RefType } from 'src/@types/type';
import { QInputProps } from 'quasar';
import { ValidationRule } from 'quasar';

export interface CommonTextInputComponentProps {
  textInput: string;
  textInputRef: RefType;
  textInputCaption?: string;
  textInputIcon?: string;
  textRule: ValidationRule[];
  textHint?: string;
  textLabel?: string;
  textType?: QInputProps['type'];
  textInputDense?: boolean;
}

const emit = defineEmits(['update', 'updateRef']);

const props = withDefaults(defineProps<CommonTextInputComponentProps>(), {
  textInput: String,
  textInputRef: null,
  textInputCaption: undefined,
  textInputIcon: undefined,
  textRule: Array,
  textHint: undefined,
  textLabel: undefined,
  textType: undefined,
  textInputDense: false,
});

const input = computed({
  get: () => props.textInput,
  set: (changedValue: string) => {
    emit('update', changedValue);
  },
});

const inputRef = computed({
  get: () => props.textInputRef,
  set: (updateRef: RefType) => {
    emit('updateRef', updateRef);
  },
});
</script>
