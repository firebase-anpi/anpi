import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { Information } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const informationConverter: FirestoreDataConverter<Information> = {
  toFirestore(data: Information): DocumentData {
    return {
      title: data.title,
      body: data.body,
      publisherName: data.publisherName,
      isPublished: data.isPublished,
      attachedFiles: data.attachedFiles,
      _createdAt: data._createdAt || serverTimestamp(),
      _createdBy: data._createdBy || authStore.currentUserId,
      _updatedAt: serverTimestamp(),
      _updatedBy: authStore.currentUserId,
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Information {
    const data = snapshot.data(options);
    const information: Information = {
      title: data.title,
      body: data.body,
      publisherName: data.publisherName,
      isPublished: data.isPublished,
      attachedFiles: data.attachedFiles,
      _id: snapshot.id, // 利便性を考慮し、_idフィールドを含めて返却
      _createdAt: data._createdAt,
      _createdBy: data._createdBy,
      _updatedAt: data._updatedAt,
      _updatedBy: data._updatedBy,
    };
    return information;
  },
};
