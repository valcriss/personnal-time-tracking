export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, delta: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
};

export const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
