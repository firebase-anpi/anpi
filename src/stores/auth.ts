import { defineStore } from 'pinia';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from 'src/firebase';

const provider = new GoogleAuthProvider();

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // ブラウザリロード対策でuidとcurrentTenantIdのみ永続化しているため、初期値としてLocalStorageから取得可能
    currentUserId: localStorage.getItem('uid') || null,
    currentTenantId: localStorage.getItem('currentTenantId') || null,
    currentUser: null as User | null,
    role: 'applicationUser',
  }),

  getters: {
    isLoggedIn: (state) => state.currentUser !== null,
    isTenantManager: (state) => state.role === 'tenantManager',
    isApplicationManager: (state) =>
      ['tenantManager', 'applicationManager'].includes(state.role), // 上位ロールは下位ロールを内包する
  },

  actions: {
    async loginWithGoogle() {
      try {
        // [Note] ブラウザの場合、認証情報はindexedDBに保持される
        // また、明示的にサインアウトしない限り認証状態は維持される
        // ref: https://firebase.google.com/docs/auth/web/auth-state-persistence
        await signInWithPopup(auth, provider);
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(
            `認証に失敗しました。${error.code} : ${error.message}`
          );
        }
        throw new Error(
          'ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいて再度ご登録ください。'
        );
      }
    },

    async sendMailLink(email: string) {
      const host =
        window.location.hostname === 'localhost'
          ? 'http://localhost:9000'
          : 'https://' + window.location.hostname;
      const actionCodeSettings = {
        url: host + '/login',
        handleCodeInApp: true,
      };
      try {
        // [Note] デフォルトの状態では、メールリンクのメールはFirebaseが用意したドメインから飛ぶ
        // 迷惑メールとして弾かれることがあるため、必要に応じてSMTPの設定をすることが望ましい

        // [Note] Emulator環境で実行した場合、メールリンクは実際のメールとしては飛ばない
        // Emulatorのコンソール画面に認証用のリンクだけが生成される
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);

        // 同一の環境・ブラウザでメールリンクを開いた場合、メールアドレス入力を省略できるようにLocalStorageに保持
        localStorage.setItem('emailForSignIn', email);
      } catch (error) {
        if (error instanceof FirebaseError) {
          throw new Error(
            `メールリンクの送信に失敗しました。${error.code} : ${error.message}`
          );
        }
        throw new Error(
          'ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいて再度ご登録ください。'
        );
      }
    },

    async verifyMailLink(url: string) {
      if (isSignInWithEmailLink(auth, url)) {
        let email: string | null = localStorage.getItem('emailForSignIn');
        if (!email) {
          // メールリンクを要求した時点とは異なる環境でメールリンクを開いた場合に該当する
          // セッション固定化攻撃を回避するために、ユーザー自身に要求したメールアドレスを入力させる
          email = window.prompt('メールアドレスを再度入力してください');
        }
        if (!!email) {
          return signInWithEmailLink(auth, email, url)
            .then(() => {
              localStorage.removeItem('emailForSignIn');
            })
            .catch((error) => {
              if (error instanceof FirebaseError) {
                throw new Error(
                  `メールリンクの検証に失敗しました。${error.code} : ${error.message}`
                );
              }
              throw new Error(
                'ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいて再度ご登録ください。'
              );
            });
        }
      }
    },

    async logout() {
      if (auth.currentUser) {
        await signOut(auth);
      } else {
        this.clearUser();
        this.router.push('/login');
      }
    },

    setUser(user: User, currentTenantId: string, role: string) {
      this.currentUser = user;
      this.currentUserId = user.uid;
      this.currentTenantId = currentTenantId;
      this.role = role;

      // リロード対策のため、LocalStorageにUIDとcurrentTenantIdを永続化しておく
      localStorage.setItem('uid', user.uid);
      localStorage.setItem('currentTenantId', currentTenantId);
    },

    clearUser() {
      this.$reset();
      localStorage.removeItem('uid');
      localStorage.removeItem('currentTenantId');
    },
  },
});
