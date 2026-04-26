import * as SQLite from 'expo-sqlite';
import type {
  LMClass,
  LMScheduleEntry,
  LMRecording,
  LMTranscriptSegment,
  LMChatMessage,
  LMFolder,
  LMBookmark,
} from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('lecturemate.db');
  await initDb(dbInstance);
  return dbInstance;
}

async function initDb(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      professorName TEXT,
      colorHex TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id TEXT PRIMARY KEY,
      classId TEXT NOT NULL,
      dayOfWeek INTEGER NOT NULL,
      startHour INTEGER NOT NULL,
      startMinute INTEGER NOT NULL,
      endHour INTEGER NOT NULL,
      endMinute INTEGER NOT NULL,
      location TEXT,
      FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      iconName TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      aiSummary TEXT,
      recordedAt INTEGER NOT NULL,
      duration REAL NOT NULL,
      fileUri TEXT NOT NULL,
      isTranscribed INTEGER NOT NULL DEFAULT 0,
      classId TEXT,
      folderId TEXT,
      FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      recordingId TEXT NOT NULL,
      text TEXT NOT NULL,
      startTime REAL NOT NULL,
      endTime REAL NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      FOREIGN KEY (recordingId) REFERENCES recordings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      recordingId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (recordingId) REFERENCES recordings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      recordingId TEXT NOT NULL,
      label TEXT,
      timestamp REAL NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (recordingId) REFERENCES recordings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recordings_recordedAt ON recordings(recordedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_recordings_classId ON recordings(classId);
    CREATE INDEX IF NOT EXISTS idx_segments_recordingId ON transcript_segments(recordingId);
    CREATE INDEX IF NOT EXISTS idx_messages_recordingId ON chat_messages(recordingId);
    CREATE INDEX IF NOT EXISTS idx_schedule_dayOfWeek ON schedule_entries(dayOfWeek);
  `);
}

// CLASSES

export async function getAllClasses(): Promise<LMClass[]> {
  const db = await getDb();
  return db.getAllAsync<LMClass>('SELECT * FROM classes ORDER BY name');
}

export async function getClassById(id: string): Promise<LMClass | null> {
  const db = await getDb();
  return db.getFirstAsync<LMClass>('SELECT * FROM classes WHERE id = ?', id);
}

export async function insertClass(c: LMClass): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO classes (id, name, professorName, colorHex, createdAt) VALUES (?, ?, ?, ?, ?)',
    c.id, c.name, c.professorName, c.colorHex, c.createdAt
  );
}

export async function deleteClass(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM classes WHERE id = ?', id);
}

// SCHEDULE ENTRIES

export async function getAllScheduleEntries(): Promise<LMScheduleEntry[]> {
  const db = await getDb();
  return db.getAllAsync<LMScheduleEntry>('SELECT * FROM schedule_entries');
}

export async function getScheduleEntriesByClass(classId: string): Promise<LMScheduleEntry[]> {
  const db = await getDb();
  return db.getAllAsync<LMScheduleEntry>(
    'SELECT * FROM schedule_entries WHERE classId = ? ORDER BY dayOfWeek, startHour, startMinute',
    classId
  );
}

export async function insertScheduleEntry(e: LMScheduleEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO schedule_entries (id, classId, dayOfWeek, startHour, startMinute, endHour, endMinute, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    e.id, e.classId, e.dayOfWeek, e.startHour, e.startMinute, e.endHour, e.endMinute, e.location
  );
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM schedule_entries WHERE id = ?', id);
}

// FOLDERS

export async function getAllFolders(): Promise<LMFolder[]> {
  const db = await getDb();
  return db.getAllAsync<LMFolder>('SELECT * FROM folders ORDER BY name');
}

export async function insertFolder(f: LMFolder): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO folders (id, name, iconName, createdAt) VALUES (?, ?, ?, ?)',
    f.id, f.name, f.iconName, f.createdAt
  );
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

// RECORDINGS

export async function getAllRecordings(): Promise<LMRecording[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM recordings ORDER BY recordedAt DESC');
  return rows.map(r => ({ ...r, isTranscribed: !!r.isTranscribed }));
}

export async function getRecordingById(id: string): Promise<LMRecording | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM recordings WHERE id = ?', id);
  return row ? { ...row, isTranscribed: !!row.isTranscribed } : null;
}

export async function insertRecording(r: LMRecording): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO recordings (id, title, aiSummary, recordedAt, duration, fileUri, isTranscribed, classId, folderId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    r.id, r.title, r.aiSummary, r.recordedAt, r.duration, r.fileUri, r.isTranscribed ? 1 : 0, r.classId, r.folderId
  );
}

export async function updateRecording(id: string, updates: Partial<LMRecording>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue;
    fields.push(`${k} = ?`);
    values.push(k === 'isTranscribed' ? (v ? 1 : 0) : v);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE recordings SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recordings WHERE id = ?', id);
}

export async function searchRecordings(query: string): Promise<LMRecording[]> {
  const db = await getDb();
  const q = `%${query}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT r.* FROM recordings r
     LEFT JOIN transcript_segments s ON r.id = s.recordingId
     WHERE r.title LIKE ? OR s.text LIKE ?
     ORDER BY r.recordedAt DESC`,
    q, q
  );
  return rows.map(r => ({ ...r, isTranscribed: !!r.isTranscribed }));
}

// TRANSCRIPT SEGMENTS

export async function getSegmentsForRecording(recordingId: string): Promise<LMTranscriptSegment[]> {
  const db = await getDb();
  return db.getAllAsync<LMTranscriptSegment>(
    'SELECT * FROM transcript_segments WHERE recordingId = ? ORDER BY startTime',
    recordingId
  );
}

export async function insertSegment(s: LMTranscriptSegment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO transcript_segments (id, recordingId, text, startTime, endTime, confidence) VALUES (?, ?, ?, ?, ?, ?)',
    s.id, s.recordingId, s.text, s.startTime, s.endTime, s.confidence
  );
}

export async function deleteSegmentsForRecording(recordingId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transcript_segments WHERE recordingId = ?', recordingId);
}

// CHAT MESSAGES

export async function getMessagesForRecording(recordingId: string): Promise<LMChatMessage[]> {
  const db = await getDb();
  return db.getAllAsync<LMChatMessage>(
    'SELECT * FROM chat_messages WHERE recordingId = ? ORDER BY timestamp',
    recordingId
  );
}

export async function insertMessage(m: LMChatMessage): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO chat_messages (id, recordingId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    m.id, m.recordingId, m.role, m.content, m.timestamp
  );
}

export async function clearMessagesForRecording(recordingId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM chat_messages WHERE recordingId = ?', recordingId);
}

// BOOKMARKS

export async function getBookmarksForRecording(recordingId: string): Promise<LMBookmark[]> {
  const db = await getDb();
  return db.getAllAsync<LMBookmark>(
    'SELECT * FROM bookmarks WHERE recordingId = ? ORDER BY timestamp',
    recordingId
  );
}

export async function insertBookmark(b: LMBookmark): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO bookmarks (id, recordingId, label, timestamp, createdAt) VALUES (?, ?, ?, ?, ?)',
    b.id, b.recordingId, b.label, b.timestamp, b.createdAt
  );
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', id);
}
