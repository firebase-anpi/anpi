import { FirebaseError } from 'firebase-admin';
import { DocumentReference, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { db, auth } from './firebase';

export const switchTenant = functions
  .region('asia-northeast1')
  .runWith({ memory: '128MB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    if (
      // 認証（Email属性がセット）されていなければ拒否
      !context?.auth?.token?.email ||
      // Emailが確認済みでなければ拒否
      !context?.auth?.token?.email_verified ||
      // 切替先のテナントIDがセットされていなければ拒否
      !data?.switchTargetTenantId ||
      // 切替先のテナントIDに対するValidation
      typeof data.switchTargetTenantId !== 'string'
    ) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザーが正しく認証されていないかパラメータが不正です。一度ログアウトをしてから再度試してください。'
      );
    }

    const uid = context.auth.uid;
    const switchTargetTenantId = data.switchTargetTenantId;

    /**
     * 切替先テナントに対する権限チェック
     */
    // [Note] サーバー向けのfirebase-admin SDKでは、getDocs()などのクライアントSDKの関数は利用できない
    const tenantUserRef = db
      .collection('tenantUsers')
      .doc(uid)
      .collection('tenants')
      .doc(switchTargetTenantId);

    try {
      const snapshot = await tenantUserRef.get();
      if (snapshot.exists) {
        const data = snapshot.data();
        const role = data?.role;
        if (role) {
          return await auth.setCustomUserClaims(uid, {
            currentTenantId: switchTargetTenantId,
          });
        }
      }

      throw new functions.https.HttpsError(
        'internal',
        'テナントまたはロールの情報が不正です。'
      );
    } catch (error) {
      throw new functions.https.HttpsError(
        'internal',
        `予期せぬエラーが発生しました。${error}`
      );
    }
  });

/**
 * EmailをキーにAuthを参照し、登録済みの場合はUID、未登録の場合はnullを返却する
 *
 * @param {string} email
 * @return {string | null}
 */
const getAuthUid = async (email: string) => {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord.uid;
  } catch (error) {
    const e = error as FirebaseError;
    if ('code' in e && e.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
};

/**
 * Firestoreを参照し、対象ユーザーがFirestoreに登録済みかを返却する
 * 判定にはtenantUsersコレクションのDocumentの存在を用いる
 *
 * @param {string} uid
 * @param {string} tenantId
 * @return {boolean}
 */
const existsFirestoreUser = async (uid: string, tenantId: string) => {
  try {
    const snapshot = await db
      .collection('tenantUsers')
      .doc(uid)
      .collection('tenants')
      .doc(tenantId)
      .get();
    return snapshot.exists;
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      `予期せぬエラーが発生しました。${error}`
    );
  }
};

/**
 * Firestoreを参照し、対象ユーザーのロールがテナント管理者かどうかを返却する
 *
 * @param {string} uid
 * @param {string} tenantId
 * @return {boolean}
 */
const isTenantManager = async (uid: string, tenantId: string) => {
  try {
    const snapshot = await db
      .collection('tenantUsers')
      .doc(uid)
      .collection('tenants')
      .doc(tenantId)
      .get();
    if (snapshot.exists) {
      const doc = snapshot.data();
      return doc?.role === 'tenantManager';
    }
    return false;
  } catch (error) {
    throw new functions.https.HttpsError(
      'permission-denied',
      `予期せぬエラーが発生しました。${error}`
    );
  }
};

/**
 * 対象データを指定されたReferenceに新規Documentとして作成する
 * ただし、既に当該Documentが存在する場合は更新する
 * この際、createdAt/createdBy/updatedAt/updatedByを付与する
 *
 * @param {object} data
 * @param {DocumentReference} ref
 * @param {string} operatorUid
 */
const createOrUpdateDoc = async (
  data: object,
  ref: DocumentReference,
  operatorUid: string
) => {
  const snapshot = await ref.get();
  if (snapshot.exists) {
    await ref.update({
      ...data,
      _updatedBy: operatorUid,
      _updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set({
      ...data,
      _createdBy: operatorUid,
      _createdAt: FieldValue.serverTimestamp(),
      _updatedBy: operatorUid,
      _updatedAt: FieldValue.serverTimestamp(),
    });
  }
};

export const createUser = functions
  .region('asia-northeast1')
  .runWith({ memory: '128MB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    if (
      // 認証（Email属性がセット）されていなければ拒否
      !context?.auth?.token?.email ||
      // Emailが確認済みでなければ拒否
      !context?.auth?.token?.email_verified ||
      // テナント管理者ロールでなければ拒否
      !isTenantManager(
        context.auth.uid,
        context?.auth?.token?.currentTenantId
      ) ||
      // 登録するユーザー情報が欠損していれば拒否
      !data?.user?.email ||
      !data?.user?.name ||
      !data?.user?.location ||
      data?.user?.isActive === undefined ||
      !data?.role
    ) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザーが正しく認証されていないかパラメータが不正です。一度ログアウトをしてから再度試してください。'
      );
    }

    const tenant = context.auth.token.currentTenantId;
    const user = {
      email: data.user.email,
      name: data.user.name,
      location: data.user.location,
      isActive: data.user.isActive,
    };
    const role = {
      // 無効なユーザーの場合、ロールの選択に関わらずnullとする
      role: data.user.isActive ? data.role : null,
    };

    // Validationが必要であれば実装（サンプルアプリのため省略）

    try {
      let uid = await getAuthUid(user.email);

      if (uid) {
        // Authには登録済みである
        if (await existsFirestoreUser(uid, tenant)) {
          // 当該テナントのFirestoreに登録されているメールアドレスの場合は拒否する
          throw new functions.https.HttpsError(
            'already-exists',
            '既に登録されているメールアドレスです。'
          );
        }
      } else {
        // Authには登録されていない
        const userRecord = await auth.createUser({
          email: user.email,
          displayName: user.name,
          emailVerified: false,
        });

        // カスタムクレームをセット
        await auth.setCustomUserClaims(userRecord.uid, {
          currentTenantId: tenant,
        });
        uid = userRecord.uid;
      }

      // Firestoreに登録(usersコレクション)
      const userRef = db
        .collection('tenants')
        .doc(tenant)
        .collection('users')
        .doc(uid);
      await createOrUpdateDoc(user, userRef, context.auth.uid);

      // Firestoreに登録(tenantUsersコレクション)
      const tenantUserRef = db
        .collection('tenantUsers')
        .doc(uid)
        .collection('tenants')
        .doc(tenant);
      await createOrUpdateDoc(role, tenantUserRef, context.auth.uid);
    } catch (error) {
      throw new functions.https.HttpsError(
        'internal',
        `予期せぬエラーが発生しました。: ${error}`
      );
    }
  });

export const updateUser = functions
  .region('asia-northeast1')
  .runWith({ memory: '128MB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    if (
      // 認証（Email属性がセット）されていなければ拒否
      !context?.auth?.token?.email ||
      // Emailが確認済みでなければ拒否
      !context?.auth?.token?.email_verified ||
      // テナント管理者ロールでなければ拒否
      !isTenantManager(
        context.auth.uid,
        context?.auth?.token?.currentTenantId
      ) ||
      // 登録するユーザー情報が欠損していれば拒否
      !data?.user?.email ||
      !data?.user?.name ||
      !data?.user?.location ||
      data?.user?.isActive === undefined ||
      !data?.role
    ) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'ユーザーが正しく認証されていないかパラメータが不正です。一度ログアウトをしてから再度試してください。'
      );
    }

    const tenant = context.auth.token.currentTenantId;
    const uid = data.user._id;
    const user = {
      name: data.user.name,
      location: data.user.location,
      isActive: data.user.isActive,
    };
    const role = {
      // 無効なユーザーの場合、ロールの選択に関わらずnullとする
      role: data.user.isActive ? data.role : null,
    };

    // Validationが必要であれば実装（サンプルアプリのため省略）

    if (
      data.user.email === context.auth.token.email &&
      role.role !== 'tenantManager'
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'テナント管理者から権限を引き下げることは、自分で行うことはできません。他のテナント管理者に実施を依頼してください。'
      );
    }

    try {
      // Firestoreを更新(usersコレクション)
      const userRef = db
        .collection('tenants')
        .doc(tenant)
        .collection('users')
        .doc(uid);
      await createOrUpdateDoc(user, userRef, context.auth.uid);

      // Firestoreを更新(tenantUsersコレクション)
      const tenantUserRef = db
        .collection('tenantUsers')
        .doc(uid)
        .collection('tenants')
        .doc(tenant);
      await createOrUpdateDoc(role, tenantUserRef, context.auth.uid);
    } catch (error) {
      throw new functions.https.HttpsError(
        'internal',
        `予期せぬエラーが発生しました。: ${error}`
      );
    }
  });
