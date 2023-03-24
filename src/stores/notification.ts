import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    showDialog: false,
    title: '',
    body: '',
  }),

  getters: {},

  actions: {
    show(title: string, body: string) {
      this.title = title;
      this.body = body;
      this.showDialog = true;
    },
    hide() {
      this.showDialog = false;
    },
  },
});
