import type { DayRepository, DayRecord } from "../src/repositories/DayRepository.js";
import type { LedgerRepository, LedgerOperationRecord } from "../src/repositories/LedgerRepository.js";

export class InMemoryDayRepository implements DayRepository {
  private days: DayRecord[] = [];

  seed(days: DayRecord[]) {
    this.days = [...days];
  }

  async getDaysInRange(from: string, to: string): Promise<DayRecord[]> {
    return this.days.filter((day) => day.date >= from && day.date <= to);
  }

  async getDaysUpTo(date: string): Promise<DayRecord[]> {
    return this.days.filter((day) => day.date <= date);
  }

  async getAllDays(): Promise<DayRecord[]> {
    return [...this.days];
  }

  async replaceAllDays(records: DayRecord[]): Promise<void> {
    this.days = [...records];
  }

  async archiveDays(dates: string[]): Promise<void> {
    if (!dates.length) return;
    this.days = this.days.map((day) =>
      dates.includes(day.date) ? { ...day, archived: true } : day
    );
  }

  async upsertDay(record: DayRecord): Promise<void> {
    const index = this.days.findIndex((day) => day.date === record.date);
    if (index >= 0) {
      this.days[index] = record;
      return;
    }
    this.days.push(record);
  }
}

export class InMemoryLedgerRepository implements LedgerRepository {
  private operations: LedgerOperationRecord[] = [];

  seed(operations: LedgerOperationRecord[]) {
    this.operations = [...operations];
  }

  async getOperationsUpTo(date: string): Promise<LedgerOperationRecord[]> {
    return this.operations.filter((operation) => operation.date <= date);
  }

  async getAllOperations(): Promise<LedgerOperationRecord[]> {
    return [...this.operations];
  }

  async replaceAllOperations(records: LedgerOperationRecord[]): Promise<void> {
    this.operations = [...records];
  }

  async addOperation(record: LedgerOperationRecord): Promise<void> {
    this.operations.push(record);
  }

  snapshot() {
    return [...this.operations];
  }
}
