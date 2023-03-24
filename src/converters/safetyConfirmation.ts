import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { SafetyConfirmation } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const safetyConfirmationConverter: FirestoreDataConverter<SafetyConfirmation> =
  {
    toFirestore(data: SafetyConfirmation): DocumentData {
      return {
        title: data.title,
        hazardType: data.hazardType,
        body: data.body,
        dueDate: data.dueDate,
        _createdAt: data._createdAt || serverTimestamp(),
        _createdBy: data._createdBy || authStore.currentUserId,
        _updatedAt: serverTimestamp(),
        _updatedBy: authStore.currentUserId,
      };
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): SafetyConfirmation {
      const data = snapshot.data(options);
      const safetyConfirmation: SafetyConfirmation = {
        title: data.title,
        hazardType: data.hazardType,
        body: data.body,
        dueDate: data.dueDate,
        _id: snapshot.id, // 利便性を考慮し、_idフィールドを含めて返却
        _createdAt: data._createdAt,
        _createdBy: data._createdBy,
        _updatedAt: data._updatedAt,
        _updatedBy: data._updatedBy,
      };
      return safetyConfirmation;
    },
  };
