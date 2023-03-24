<template>
  <q-page class="row justify-center">
    <q-card
      square
      class="q-pa-md q-ma-none no-shadow bg-grey-2"
      style="width: 100%"
    >
      <q-scroll-area ref="scrollAreaRef" style="height: 100%; max-width: 100%">
        <q-pull-to-refresh @refresh="getPreviousMessages">
          <!-- メッセージは最新が下にくるので、配列は逆順に変更する -->
          <q-chat-message
            v-for="message in state.messages.slice().reverse()"
            :key="message._id"
            :name="
              message._createdBy === authStore.currentUserId
                ? ''
                : message.publisherName
            "
            :text="[message.body]"
            :bg-color="
              message._createdBy === authStore.currentUserId
                ? 'primary'
                : 'secondary'
            "
            :text-color="
              message._createdBy === authStore.currentUserId ? 'white' : 'black'
            "
            :stamp="
              date.formatDate(
                message._createdAt?.toDate(),
                'YYYY/MM/DD HH:mm:ss'
              )
            "
            :sent="message._createdBy === authStore.currentUserId"
          />
        </q-pull-to-refresh>
      </q-scroll-area>
    </q-card>

    <q-footer bordered class="bg-white">
      <div class="q-ml-md q-mr-xs q-mb-sm">
        <q-input
          v-model="inputText"
          label="メッセージを入力（100文字以内）"
          borderless
          @keydown.enter="addMessage"
        >
          <template v-slot:after>
            <q-btn round flat icon="send" @click="addMessage" />
          </template>
        </q-input>
      </div>
    </q-footer>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, onUnmounted } from 'vue';
import { FirebaseError } from 'firebase/app';
import { db } from 'src/firebase';
import {
  addDoc,
  collection,
  doc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { date, QScrollArea } from 'quasar';
import { Message } from 'src/@types/type';
import { userConverter } from 'src/converters/user';
import { messageConverter } from 'src/converters/message';
import { useNotificationStore } from 'src/stores/notification';
import { useAuthStore } from 'src/stores/auth';
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

/*************************************
 * メッセージ領域制御
 *************************************/
const inputText = ref('');
const publisherName = ref('');
const scrollAreaRef = ref(null);

/*************************************
 * 状態に応じた表示制御
 *************************************/
const loading = ref(false);

/*************************************
 * ユーザー操作
 *************************************/
let lastVisible: DocumentSnapshot | null; // ページネーション用
const getPreviousMessages = async (done: () => void) => {
  if (!authStore.currentTenantId) {
    notificationStore.show(
      'データ登録に失敗',
      '画面リロード等の操作によりデータ登録に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    done();
    return;
  }

  if (lastVisible === null) {
    notificationStore.show(
      '表示するデータがありません',
      '最も古いデータが既に表示されています。'
    );
    done();
    return;
  }

  // ページネーション用のクエリカーソルを用いて、次の10件を取得する
  const snapshot = await getDocs(
    query(
      collection(db, 'tenants', authStore.currentTenantId, 'messages'),
      orderBy('_createdAt', 'desc'),
      startAfter(lastVisible),
      limit(10)
    )
  );

  if (snapshot.docs.length > 0) {
    // 次のページネーション用に更新
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const previousMessages = snapshot.docs.map((doc) => doc.data() as Message);

    // 取得した古いデータを画面表示用に追加
    for (let index = 0; index < previousMessages.length; index++) {
      const message = previousMessages[index];
      state.messages.push(message);
    }
  } else {
    // 取得した古いデータが0件の場合（それ以上取得可能なデータがない）
    lastVisible = null;
    notificationStore.show(
      '表示するデータがありません',
      '最も古いデータが既に表示されています。'
    );
  }

  // ローディングの終了
  done();
};

const scrollToLatest = () => {
  // 最新メッセージの位置に表示をスクロール
  if (scrollAreaRef.value) {
    const scrollArea = <QScrollArea>scrollAreaRef.value;
    const scroll = scrollArea.getScroll();
    const offset = 64; // メッセージ入力フィールドの高さ
    const scrollToBottom = scroll.verticalSize + offset;

    scrollArea.setScrollPosition('vertical', scrollToBottom, 500);
  }
};

const addMessage = async () => {
  if (
    !inputText.value ||
    inputText.value.length > 100 ||
    loading.value // 連続送信防止
  ) {
    return;
  }

  if (!authStore.currentTenantId) {
    notificationStore.show(
      'データ登録に失敗',
      '画面リロード等の操作によりデータ登録に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  loading.value = !loading.value;
  try {
    const message: Message = {
      body: inputText.value,
      publisherName: publisherName.value,
    };
    const ref = collection(
      db,
      'tenants',
      authStore.currentTenantId,
      'messages'
    ).withConverter(messageConverter);
    await addDoc(ref, message);

    scrollToLatest();
    inputText.value = '';
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show('メッセージの登録に失敗', error.code);
    }
  } finally {
    loading.value = !loading.value;
  }
};

/*************************************
 * 登録済みメッセージ および ユーザー氏名の取得
 *************************************/
const state = reactive({
  messages: [] as Message[],
});

let unsubscribe: Unsubscribe; // リアルタイムリスナーの解除
onMounted(async () => {
  if (!authStore.currentTenantId || !authStore.currentUserId) {
    notificationStore.show(
      'データ取得に失敗',
      '画面リロード等の操作によりデータ取得に必要な情報が失われました。ログアウトしてやり直してください。'
    );
    return;
  }

  try {
    /*******************
     * ユーザー情報を取得
     */
    const userSnapshot = await getDoc(
      doc(
        db,
        'tenants',
        authStore.currentTenantId,
        'users',
        authStore.currentUserId
      ).withConverter(userConverter)
    );
    if (userSnapshot.exists()) {
      const user = userSnapshot.data();
      publisherName.value = user.name;
    } else {
      notificationStore.show(
        'データ取得に失敗',
        'ユーザー情報が存在しません。'
      );
      return;
    }

    /*******************
     * メッセージを取得
     */
    state.messages.length = 0;

    // 現時点より過去のメッセージを10件分取得（過去分は非リアルタイム）
    // 今回の仕様では過去分のメッセージ更新はリアルタイム性は必要ではない
    const messagesSnapshot = await getDocs(
      query(
        collection(db, 'tenants', authStore.currentTenantId, 'messages'),
        orderBy('_createdAt', 'desc'),
        limit(10)
      )
    );

    // ページネーションで古いデータを取得するのときのために、カーソル位置を保持しておく
    // [Note] ここで使われるのはDocumentSnapshotであり、Documentデータそのものではない点に注意
    if (messagesSnapshot.docs.length > 0) {
      lastVisible = messagesSnapshot.docs[messagesSnapshot.docs.length - 1];
      state.messages = messagesSnapshot.docs.map(
        (doc) => doc.data() as Message
      );
    } else {
      lastVisible = null;
    }

    scrollToLatest();

    // 現時点より新しいメッセージに対してリアルタイムリスナーを設定
    const q = query(
      collection(
        db,
        'tenants',
        authStore.currentTenantId,
        'messages'
      ).withConverter(messageConverter),
      where('_createdAt', '>', Timestamp.now()),
      orderBy('_createdAt', 'asc')
    );
    // [Note] onSnapshotの戻りはリスナー解除用のFunctionになっている
    unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          // 先頭（最も新しい）に最新メッセージを追加
          state.messages.unshift(change.doc.data());
          scrollToLatest();
        }
      });
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      notificationStore.show(
        'データ取得に失敗',
        `ネットワーク接続に問題がある可能性があります。お手数ですがしばらく時間をおいてください。: ${error.code}`
      );
    }
  }
});

onUnmounted(() => {
  // [Note] 不要になったタイミング（コンポーネント破棄時など）で、必ずリスナーも解除する。解除しないと残り続ける
  if (unsubscribe !== undefined) {
    unsubscribe();
  }
});
</script>
