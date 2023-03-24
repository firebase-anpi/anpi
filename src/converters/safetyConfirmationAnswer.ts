import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  serverTimestamp,
  SnapshotOptions,
} from 'firebase/firestore';
import { SafetyConfirmationAnswer } from 'src/@types/type';
import { useAuthStore } from 'src/stores/auth';

const authStore = useAuthStore();
export const safetyConfirmationAnswerConverter: FirestoreDataConverter<SafetyConfirmationAnswer> =
  {
    toFirestore(data: SafetyConfirmationAnswer): DocumentData {
      return {
        safetyStatus: data.safetyStatus,
        memo: data.memo,
        nameSnapshot: data.nameSnapshot,
        locationSnapshot: data.locationSnapshot,
        _createdAt: data._createdAt || serverTimestamp(),
        _createdBy: data._createdBy || authStore.currentUserId,
        _updatedAt: serverTimestamp(),
        _updatedBy: authStore.currentUserId,
      };
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): SafetyConfirmationAnswer {
      const data = snapshot.data(options);
      const answer: SafetyConfirmationAnswer = {
        safetyStatus: data.safetyStatus,
        memo: data.memo,
        nameSnapshot: data.nameSnapshot,
        locationSnapshot: data.locationSnapshot,
        _id: snapshot.id, // 利便性を考慮し、_idフィールドを含めて返却
        _createdAt: data._createdAt,
        _createdBy: data._createdBy,
        _updatedAt: data._updatedAt,
        _updatedBy: data._updatedBy,
      };
      return answer;
    },
  };
