import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { TenantUser } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const tenantUserConverter: FirestoreDataConverter<TenantUser> = {
  toFirestore(data: TenantUser): DocumentData {
    return {
      role: data.role,
      _createdAt: data._createdAt || serverTimestamp(),
      _createdBy: data._createdBy || authStore.currentUserId,
      _updatedAt: serverTimestamp(),
      _updatedBy: authStore.currentUserId,
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): TenantUser {
    const data = snapshot.data(options);
    const tenantUser: TenantUser = {
      role: data.role,
      _createdAt: data._createdAt,
      _createdBy: data._createdBy,
      _updatedAt: data._updatedAt,
      _updatedBy: data._updatedBy,
    };
    return tenantUser;
  },
};
