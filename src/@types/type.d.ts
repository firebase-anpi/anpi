import { UserInfo } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { ValidationRule } from 'quasar';
import { VNodeRef } from 'vue';

export interface ValidationRuleOption {
  [key: string]: ValidationRule[];
}

export type RefType = VNodeRef | null;

export interface FirebaseEntityBase {
  _id?: string;
  _createdAt?: Timestamp;
  _updatedAt?: Timestamp;
  _createdBy?: UserInfo['uid'];
  _updatedBy?: UserInfo['uid'];
}

export interface User extends FirebaseEntityBase {
  email: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface TenantUser extends FirebaseEntityBase {
  role: 'applicationUser' | 'applicationManager' | 'tenantManager' | null;
}

export interface SafetyConfirmation extends FirebaseEntityBase {
  title: string;
  body?: string;
  hazardType: 'hazard_quake' | 'hazard_water' | 'hazard_other';
  dueDate: string;
}

export interface SafetyConfirmationAnswer extends FirebaseEntityBase {
  safetyStatus?: '安全' | '軽傷' | '重傷';
  memo?: string;
  nameSnapshot: User['name'];
  locationSnapshot: User['location'];
}

export interface Information extends FirebaseEntityBase {
  title: string;
  body?: string;
  publisherName: User['name'];
  isPublished: boolean;
  attachedFiles: string[];
}

export interface Message extends FirebaseEntityBase {
  body: string;
  publisherName: User['name'];
}
