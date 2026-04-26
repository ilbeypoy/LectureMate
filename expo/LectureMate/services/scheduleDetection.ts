import type { LMClass, LMScheduleEntry, RecordingSuggestion } from '../types';

export function detectCurrentContext(
  classes: LMClass[],
  entries: LMScheduleEntry[]
): RecordingSuggestion {
  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 1 : now.getDay() + 1;
  // JS getDay: 0=Sun..6=Sat. Bizim formatimiz: 1=Pazar..7=Cumartesi
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEntries = entries.filter((e) => e.dayOfWeek === currentDayOfWeek);

  for (const entry of todayEntries) {
    const startMinutes = entry.startHour * 60 + entry.startMinute;
    const endMinutes = entry.endHour * 60 + entry.endMinute;
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) continue;

    // Su an derste mi?
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { type: 'currentlyInClass', class: cls, entry };
    }
  }

  // Sonra: 30 dk icinde ders var mi?
  let bestUpcoming: { class: LMClass; entry: LMScheduleEntry; minutesUntil: number } | null = null;
  for (const entry of todayEntries) {
    const startMinutes = entry.startHour * 60 + entry.startMinute;
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) continue;

    const diff = startMinutes - currentMinutes;
    if (diff > 0 && diff <= 30) {
      if (!bestUpcoming || diff < bestUpcoming.minutesUntil) {
        bestUpcoming = { class: cls, entry, minutesUntil: diff };
      }
    }
  }

  if (bestUpcoming) {
    return {
      type: 'upcomingClass',
      class: bestUpcoming.class,
      entry: bestUpcoming.entry,
      minutesUntil: bestUpcoming.minutesUntil,
    };
  }

  return { type: 'noScheduledClass' };
}
