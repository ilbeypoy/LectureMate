export interface LMClass {
  id: string;
  name: string;
  professorName: string | null;
  colorHex: string;
  createdAt: number;
}

export interface LMScheduleEntry {
  id: string;
  classId: string;
  dayOfWeek: number; // 1=Pazar, 2=Pazartesi, ... 7=Cumartesi
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  location: string | null;
}

export interface LMRecording {
  id: string;
  title: string;
  aiSummary: string | null;
  recordedAt: number;
  duration: number; // saniye
  fileUri: string;
  isTranscribed: boolean;
  classId: string | null;
  folderId: string | null;
}

export interface LMTranscriptSegment {
  id: string;
  recordingId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface LMChatMessage {
  id: string;
  recordingId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LMFolder {
  id: string;
  name: string;
  iconName: string;
  createdAt: number;
}

export interface LMBookmark {
  id: string;
  recordingId: string;
  label: string | null;
  timestamp: number;
  createdAt: number;
}

export type RecordingSuggestion =
  | { type: 'currentlyInClass'; class: LMClass; entry: LMScheduleEntry }
  | { type: 'upcomingClass'; class: LMClass; entry: LMScheduleEntry; minutesUntil: number }
  | { type: 'noScheduledClass' };
