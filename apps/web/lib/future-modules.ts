/**
 * Future product boundaries. They remain disabled until their security,
 * content, privacy and operational reviews are complete.
 */
export const futureFeatureFlags = Object.freeze({
  auth: false,
  userRecords: false,
  cloudStorage: false,
  aiReading: false,
  ar: false,
  community: false,
  marketplace: false,
});

export type FutureFeature = keyof typeof futureFeatureFlags;

export interface UserIdentity {
  readonly id: string;
  readonly provider: 'phone' | 'wechat';
}

export interface AuthPort {
  currentUser(): Promise<UserIdentity | null>;
}

export interface UserRecordPort<TRecord> {
  list(userId: string): Promise<readonly TRecord[]>;
  save(userId: string, record: TRecord): Promise<void>;
  delete(userId: string, recordId: string): Promise<void>;
}

export interface CloudStoragePort<TPayload> {
  read(key: string): Promise<TPayload | null>;
  write(key: string, value: TPayload): Promise<void>;
  remove(key: string): Promise<void>;
}

export class AnonymousAuthAdapter implements AuthPort {
  async currentUser(): Promise<null> {
    return null;
  }
}
