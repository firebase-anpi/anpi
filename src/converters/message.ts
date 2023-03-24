import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { Message } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore(data: Message): DocumentData {
    return {
      body: data.body,
      publisherName: data.publisherName,
      _createdAt: data._createdAt || serverTimestamp(),
      _createdBy: data._createdBy || authStore.currentUserId,
      _updatedAt: serverTimestamp(),
      _updatedBy: authStore.currentUserId,
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Message {
    const data = snapshot.data(options);
    const message: Message = {
      body: data.body,
      publisherName: data.publisherName,
      _id: snapshot.id, // 利便性を考慮し、_idフィールドを含めて返却
      _createdAt: data._createdAt,
      _createdBy: data._createdBy,
      _updatedAt: data._updatedAt,
      _updatedBy: data._updatedBy,
    };
    return message;
  },
};
