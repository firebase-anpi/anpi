import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { User } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(data: User): DocumentData {
    return {
      email: data.email,
      name: data.name,
      location: data.location,
      isActive: data.isActive,
      _createdAt: data._createdAt || serverTimestamp(),
      _createdBy: data._createdBy || authStore.currentUserId,
      _updatedAt: serverTimestamp(),
      _updatedBy: authStore.currentUserId,
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): User {
    const data = snapshot.data(options);
    const user: User = {
      email: data.email,
      name: data.name,
      location: data.location,
      isActive: data.isActive,
      _id: snapshot.id, // 利便性を考慮し、_idフィールドを含めて返却
      _createdAt: data._createdAt,
      _createdBy: data._createdBy,
      _updatedAt: data._updatedAt,
      _updatedBy: data._updatedBy,
    };
    return user;
  },
};
