import Foundation
import SwiftData

@MainActor
@Observable
final class RecordingViewModel {
    enum RecordingState {
        case idle, recording, paused, saving
    }

    var state: RecordingState = .idle
    var elapsedTime: TimeInterval = 0
    var audioLevel: Float = 0
    var liveTranscript = ""
    var selectedClass: LMClass?
    var recordingTitle = ""
    var selectedFolder: LMFolder?
    var bookmarks: [BookmarkEntry] = []
    var errorMessage: String?

    struct BookmarkEntry {
        let timestamp: TimeInterval
        let label: String?
    }

    let recorder = AudioRecorderService()
    let transcription = TranscriptionService()
    private var recordingURL: URL?
    private var recordingStartDate: Date?

    // MARK: - Kayit Islemleri

    func startRecording() {
        do {
            let filename = UUID().uuidString
            recordingURL = try recorder.startRecording(filename: filename)
            recordingStartDate = Date()
            state = .recording

            // Canli transkript baslat
            try transcription.startLiveTranscription { [weak self] segment in
                // Segment verisi geldiginde islenecek
            }
        } catch {
            errorMessage = "Kayit baslatilamadi: \(error.localizedDescription)"
        }
    }

    func pauseRecording() {
        recorder.pauseRecording()
        state = .paused
    }

    func resumeRecording() {
        recorder.resumeRecording()
        state = .recording
    }

    func stopAndSave(modelContext: ModelContext) -> LMRecording? {
        state = .saving
        transcription.stopLiveTranscription()

        guard let result = recorder.stopRecording() else {
            state = .idle
            return nil
        }

        let fileManager = FileManager.default
        let relativePath = fileManager.relativeRecordingPath(for: result.url.lastPathComponent)

        let title = recordingTitle.isEmpty
            ? (selectedClass?.name ?? "Kayit") + " - " + Date().shortDateString
            : recordingTitle

        let recording = LMRecording(
            title: title,
            duration: result.duration,
            fileRelativePath: relativePath,
            classRef: selectedClass,
            folder: selectedFolder
        )

        // Transkript segmentlerini ekle
        let transcriptText = transcription.liveTranscript
        if !transcriptText.isEmpty {
            let segment = LMTranscriptSegment(
                text: transcriptText,
                startTime: 0,
                endTime: result.duration,
                recording: recording
            )
            recording.segments.append(segment)
            recording.isTranscribed = true
        }

        // Yer imlerini ekle
        for bookmark in bookmarks {
            let lmBookmark = LMBookmark(
                timestamp: bookmark.timestamp,
                label: bookmark.label,
                recording: recording
            )
            recording.bookmarks.append(lmBookmark)
        }

        modelContext.insert(recording)
        try? modelContext.save()

        // Durumu sifirla
        state = .idle
        liveTranscript = ""
        bookmarks = []
        recordingTitle = ""

        return recording
    }

    func addBookmark(label: String? = nil) {
        let timestamp = recorder.currentTime
        bookmarks.append(BookmarkEntry(timestamp: timestamp, label: label))
    }

    func cancelRecording() {
        transcription.stopLiveTranscription()
        if let result = recorder.stopRecording() {
            // Dosyayi sil
            try? FileManager.default.removeItem(at: result.url)
        }
        state = .idle
        liveTranscript = ""
        bookmarks = []
    }

    var isRecording: Bool {
        state == .recording || state == .paused
    }
}
