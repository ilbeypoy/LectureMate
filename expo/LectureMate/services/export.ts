import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { LMRecording, LMTranscriptSegment, LMClass } from '../types';
import { formatDate, formatDuration, formatTime } from '../utils/format';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportAsText(
  recording: LMRecording,
  segments: LMTranscriptSegment[],
  cls: LMClass | null
): Promise<void> {
  let text = '';
  text += 'DERS KAYDI\n';
  text += '='.repeat(40) + '\n\n';
  text += `Baslik: ${recording.title}\n`;
  if (cls) text += `Ders: ${cls.name}\n`;
  text += `Tarih: ${formatDate(recording.recordedAt)}\n`;
  text += `Sure: ${formatDuration(recording.duration)}\n`;

  if (recording.aiSummary) {
    text += '\n' + '-'.repeat(40) + '\n';
    text += 'AI OZET\n';
    text += '-'.repeat(40) + '\n';
    text += recording.aiSummary + '\n';
  }

  text += '\n' + '-'.repeat(40) + '\n';
  text += 'TRANSKRIPT\n';
  text += '-'.repeat(40) + '\n\n';

  for (const seg of segments) {
    text += `[${formatTime(seg.startTime)}] ${seg.text}\n`;
  }

  const filename = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, text);
  await Sharing.shareAsync(fileUri);
}

export async function exportAsPDF(
  recording: LMRecording,
  segments: LMTranscriptSegment[],
  cls: LMClass | null
): Promise<void> {
  const segmentsHtml = segments
    .map(
      (s) =>
        `<div class="segment"><span class="time">[${formatTime(s.startTime)}]</span> ${escapeHtml(s.text)}</div>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #212529; }
        h1 { color: #4A90D9; margin-bottom: 8px; }
        .meta { color: #6C757D; font-size: 12px; margin-bottom: 24px; }
        .summary {
          background: #F0F4FF;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .summary h2 { color: #7B68EE; font-size: 16px; margin-top: 0; }
        h2 { font-size: 18px; color: #4A90D9; margin-top: 24px; }
        .segment {
          padding: 6px 0;
          font-size: 14px;
          line-height: 1.5;
          border-bottom: 1px solid #F0F0F0;
        }
        .time {
          color: #4A90D9;
          font-family: monospace;
          font-weight: bold;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(recording.title)}</h1>
      <div class="meta">
        ${cls ? `${escapeHtml(cls.name)} &bull; ` : ''}${formatDate(recording.recordedAt)} &bull; ${formatDuration(recording.duration)}
      </div>
      ${
        recording.aiSummary
          ? `<div class="summary"><h2>Ozet</h2><div>${escapeHtml(recording.aiSummary).replace(/\n/g, '<br>')}</div></div>`
          : ''
      }
      <h2>Transkript</h2>
      ${segmentsHtml || '<p>Transkript bulunmuyor</p>'}
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}
