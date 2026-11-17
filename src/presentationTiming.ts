export type WeekNumber = 1 | 2 | 3 | 4;
export type PresentationEntry = {
  position: number;
  teamName: string;
  projectName: string | null;
  members?: string[];
  memberCount?: number;
  isMyTeam?: boolean;
};
export type PresentationSlot = PresentationEntry & {
  startMinute: number | null;
  talkMinutes: number | null;
  qaMinutes: number;
};
export const PRESENTATION_START_MINUTE = 8 * 60 + 30;

export function highestActiveWeek(states: Record<number, boolean> | null): WeekNumber {
  return ([4, 3, 2, 1] as const).find(n => states?.[n] === true) || 1;
}

export function presentationSlots(order: PresentationEntry[]): PresentationSlot[] {
  let next: number | null = PRESENTATION_START_MINUTE;
  return order.map(entry => {
    const count = entry.members?.length ?? entry.memberCount ?? 0;
    const valid = Number.isInteger(count) && count > 0 &&
      (entry.memberCount === undefined || entry.memberCount === count);
    const talkMinutes = valid && count <= 3 ? 15 : valid && count === 4 ? 20 : null;
    const slot = { ...entry, startMinute: next, talkMinutes, qaMinutes: 5 };
    next = next !== null && talkMinutes !== null ? next + talkMinutes + 5 : null;
    return slot;
  });
}

export function presentationClock(minute: number | null) {
  if (minute === null || !Number.isInteger(minute) || minute < 0 || minute >= 24 * 60)
    return 'To be confirmed';
  const hours = Math.floor(minute / 60), minutes = minute % 60;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
