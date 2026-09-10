/** Day of week as 0 = Monday .. 6 = Sunday, in Asia/Kolkata. */
export function todayIndex(now = new Date()): number {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return (ist.getDay() + 6) % 7;
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function todayName(now = new Date()): string {
  return DAY_NAMES[todayIndex(now)];
}
