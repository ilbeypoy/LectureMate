import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '../constants/colors';

const BASE_URL = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export class DeepSeekService {
  static async getAPIKey(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.DEEPSEEK_API_KEY);
  }

  static async saveAPIKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.DEEPSEEK_API_KEY, key);
  }

  static async deleteAPIKey(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.DEEPSEEK_API_KEY);
  }

  static async isConfigured(): Promise<boolean> {
    const key = await this.getAPIKey();
    return !!key && key.length > 0;
  }

  static async testConnection(): Promise<boolean> {
    try {
      await this.sendChatRequest(
        [{ role: 'user', content: 'Merhaba' }],
        10,
        false
      );
      return true;
    } catch {
      return false;
    }
  }

  static async generateTitle(transcript: string): Promise<string> {
    const truncated = transcript.substring(0, 3000);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Sen bir ders notu asistanisin. Verilen ders transkripti icin kisa ve aciklayici bir baslik olustur. Sadece basligi yaz, baska bir sey ekleme. Baslik 5-10 kelime olmali.',
      },
      { role: 'user', content: `Bu ders transkriptine bir baslik olustur:\n\n${truncated}` },
    ];
    return this.sendChatRequest(messages, 50);
  }

  static async generateSummary(transcript: string): Promise<string> {
    const truncated = transcript.substring(0, 8000);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Sen bir ders notu asistanisin. Verilen ders transkriptinin ozetini madde isaretleri ile olustur. 3-5 madde ile ana konulari ozetle. Turkce yaz.',
      },
      { role: 'user', content: `Bu ders transkriptini ozetle:\n\n${truncated}` },
    ];
    return this.sendChatRequest(messages, 500);
  }

  static async askQuestion(
    question: string,
    context: string,
    history: ChatHistoryItem[] = []
  ): Promise<string> {
    const truncatedContext = context.substring(0, 10000);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Sen bir ders calisma asistanisin. Asagidaki ders transkriptine dayanarak ogrencinin sorularini yanitla.
SADECE transkriptte bulunan bilgilere dayanarak cevap ver.
Transkriptte bulunmayan bilgiler icin "Bu bilgi ders kaydinda bulunamiyor" de.
Turkce cevap ver.

DERS TRANSKRIPTI:
${truncatedContext}`,
      },
      ...history.map((h) => ({ role: h.role as any, content: h.content })),
      { role: 'user', content: question },
    ];
    return this.sendChatRequest(messages, 1000);
  }

  static async *askQuestionStreaming(
    question: string,
    context: string,
    history: ChatHistoryItem[] = []
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = await this.getAPIKey();
    if (!apiKey) throw new Error('DeepSeek API anahtari ayarlanmamis');

    const truncatedContext = context.substring(0, 10000);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Sen bir ders calisma asistanisin. Asagidaki ders transkriptine dayanarak ogrencinin sorularini yanitla.
SADECE transkriptte bulunan bilgilere dayanarak cevap ver.
Turkce cevap ver.

DERS TRANSKRIPTI:
${truncatedContext}`,
      },
      ...history.map((h) => ({ role: h.role as any, content: h.content })),
      { role: 'user', content: question },
    ];

    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API hatasi: HTTP ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream okunamadi');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.substring(6).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }

  static async generateFlashcards(transcript: string): Promise<Flashcard[]> {
    const truncated = transcript.substring(0, 8000);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Sen bir ders calisma asistanisin. Verilen ders transkriptinden calisma kartlari (flashcards) olustur.
Her kart bir soru ve cevap icermeli. 5-10 kart olustur.
Yaniti SADECE su JSON formatinda ver, baska bir sey ekleme:
[{"question": "Soru metni", "answer": "Cevap metni"}]`,
      },
      { role: 'user', content: `Bu transkriptten calisma kartlari olustur:\n\n${truncated}` },
    ];
    const response = await this.sendChatRequest(messages, 2000);
    try {
      // JSON markdown bloklarini temizle
      const cleaned = response.replace(/```json\s*|\s*```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      throw new Error('Yanit ayristirma hatasi');
    }
  }

  private static async sendChatRequest(
    messages: ChatMessage[],
    maxTokens: number,
    expectStream: boolean = false
  ): Promise<string> {
    const apiKey = await this.getAPIKey();
    if (!apiKey) throw new Error('DeepSeek API anahtari ayarlanmamis');

    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API hatasi: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return (data.choices?.[0]?.message?.content ?? '').trim();
  }
}
