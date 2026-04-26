# LectureMate

Ders ses kayit + ucretsiz Apple transkript + DeepSeek AI sohbet uygulamasi.

## Ozellikler

- Ders ses kaydi (m4a/AAC, kucuk dosya)
- Apple Speech ile ucretsiz on-device transkript (Turkce, sinirsiz)
- Akilli ders programi tespiti (uygulamayi acince "su anki ders icin kaydet" onerisi)
- DeepSeek AI: otomatik baslik, ozet, transkripte soru-cevap (streaming)
- Yer imleri (kayit sirasinda onemli anlari isaretle)
- Tam metin arama (tum transkriptlerde)
- PDF ve metin disa aktarma
- Ses oynatma hizi (0.5x - 2x)
- TTS (sesli okuma) - Apple TTS, ucretsiz
- Ders oncesi yerel bildirim hatirlatici
- iCloud-suz, tamamen yerel SQLite veritabani

## Teknolojiler

- Expo SDK 54 + Expo Router
- TypeScript
- expo-speech-recognition (Apple Speech wrapper)
- expo-speech (TTS)
- expo-av (kayit + oynatma)
- expo-sqlite (yerel veritabani)
- expo-secure-store (API anahtari Keychain)
- DeepSeek API (OpenAI uyumlu)

## Calistirma

```bash
npm install --legacy-peer-deps
npx expo prebuild  # gercek cihaz icin native dosyalar
npx expo run:ios   # iPhone'a yukle
```

`expo-speech-recognition` Expo Go'da calismaz - **development build** (EAS Build veya `expo prebuild`) gerekli.

## EAS Build (Bulutta IPA olusturma)

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```
