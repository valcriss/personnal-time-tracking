export type LedgerOperationRecord = {
  date: string;
  minutesDelta: number;
  reason: string;
  dayDate?: string | null;
};

export interface LedgerRepository {
  getOperationsUpTo(date: string): Promise<LedgerOperationRecord[]>;
  getAllOperations(): Promise<LedgerOperationRecord[]>;
  replaceAllOperations(records: LedgerOperationRecord[]): Promise<void>;
  addOperation(record: LedgerOperationRecord): Promise<void>;
}
