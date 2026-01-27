import type { DayRepository } from "../repositories/DayRepository.js";

export const archiveDays = async (repo: DayRepository, dates: string[]) => {
  await repo.archiveDays(dates);
};
