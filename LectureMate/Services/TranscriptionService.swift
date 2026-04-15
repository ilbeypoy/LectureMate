import Foundation
import Speech
import AVFoundation

@Observable
final class TranscriptionService: NSObject {
    var isTranscribing = false
    var liveTranscript = ""
    var progress: Double = 0
    var errorMessage: String?

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    // Rolling restart icin
    private var fullTranscript = ""
    private var segments: [TranscriptSegmentData] = []
    private var sessionStartOffset: TimeInterval = 0
    private var restartTimer: Timer?
    private var onSegmentCallback: ((TranscriptSegmentData) -> Void)?

    struct TranscriptSegmentData {
        let text: String
        let startTime: TimeInterval
        let endTime: TimeInterval
        let confidence: Float
    }

    // MARK: - Izinler

    static func requestPermission() async -> Bool {
        let speechStatus = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
        return speechStatus
    }

    // MARK: - Canli Transkript (Kayit Sirasinda)

    func startLiveTranscription(locale: Locale = Locale(identifier: "tr-TR"),
                                 onSegment: @escaping (TranscriptSegmentData) -> Void) throws {
        speechRecognizer = SFSpeechRecognizer(locale: locale)
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            errorMessage = "Konusma tanima bu dil icin kulanilamiyor"
            return
        }

        self.onSegmentCallback = onSegment
        fullTranscript = ""
        segments = []
        sessionStartOffset = 0

        try startRecognitionSession()
        startRollingRestartTimer()

        isTranscribing = true
    }

    private func startRecognitionSession() throws {
        recognitionTask?.cancel()
        recognitionTask = nil

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = true
        recognitionRequest.addsPunctuation = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Onceki tap varsa kaldir
        inputNode.removeTap(onBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self else { return }

            if let result {
                let transcription = result.bestTranscription
                let currentText = transcription.formattedString

                DispatchQueue.main.async {
                    self.liveTranscript = self.fullTranscript + " " + currentText
                }

                // Segment verisi olustur
                for segment in transcription.segments {
                    let segmentData = TranscriptSegmentData(
                        text: segment.substring,
                        startTime: self.sessionStartOffset + segment.timestamp,
                        endTime: self.sessionStartOffset + segment.timestamp + segment.duration,
                        confidence: segment.confidence
                    )
                    self.onSegmentCallback?(segmentData)
                }

                if result.isFinal {
                    self.fullTranscript += " " + currentText
                }
            }

            if error != nil {
                // Hata durumunda sessizce devam et
            }
        }

        if !audioEngine.isRunning {
            audioEngine.prepare()
            try audioEngine.start()
        }
    }

    // MARK: - Rolling Restart (1 dakika siniri icin)

    private func startRollingRestartTimer() {
        restartTimer = Timer.scheduledTimer(withTimeInterval: 55, repeats: true) { [weak self] _ in
            self?.restartRecognitionSession()
        }
    }

    private func restartRecognitionSession() {
        guard isTranscribing else { return }

        // Mevcut session'i sonlandir
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        // Offset guncelle
        sessionStartOffset += 55

        // Yeni session baslat
        do {
            try startRecognitionSession()
        } catch {
            errorMessage = "Transkript yeniden baslatma hatasi: \(error.localizedDescription)"
        }
    }

    func stopLiveTranscription() {
        restartTimer?.invalidate()
        restartTimer = nil

        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil

        audioEngine.inputNode.removeTap(onBus: 0)
        if audioEngine.isRunning {
            audioEngine.stop()
        }

        isTranscribing = false
        onSegmentCallback = nil
    }

    // MARK: - Dosyadan Transkript (Kayit Sonrasi)

    func transcribeFile(at url: URL, locale: Locale = Locale(identifier: "tr-TR")) async throws -> [TranscriptSegmentData] {
        let recognizer = SFSpeechRecognizer(locale: locale)
        guard let recognizer, recognizer.isAvailable else {
            throw TranscriptionError.recognizerUnavailable
        }

        let request = SFSpeechURLRecognitionRequest(url: url)
        request.requiresOnDeviceRecognition = true
        request.addsPunctuation = true

        isTranscribing = true

        return try await withCheckedThrowingContinuation { continuation in
            recognizer.recognitionTask(with: request) { [weak self] result, error in
                if let error {
                    self?.isTranscribing = false
                    continuation.resume(throwing: error)
                    return
                }

                guard let result, result.isFinal else { return }

                let segments = result.bestTranscription.segments.map { segment in
                    TranscriptSegmentData(
                        text: segment.substring,
                        startTime: segment.timestamp,
                        endTime: segment.timestamp + segment.duration,
                        confidence: segment.confidence
                    )
                }

                self?.isTranscribing = false
                continuation.resume(returning: segments)
            }
        }
    }

    // MARK: - Errors

    enum TranscriptionError: LocalizedError {
        case recognizerUnavailable
        case permissionDenied

        var errorDescription: String? {
            switch self {
            case .recognizerUnavailable:
                return "Konusma tanima motoru kullanilamiyor"
            case .permissionDenied:
                return "Konusma tanima izni reddedildi"
            }
        }
    }
}
