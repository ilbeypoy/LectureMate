import Foundation
import SwiftData

@MainActor
@Observable
final class TranscriptViewModel {
    var recording: LMRecording
    var isRetranscribing = false
    var errorMessage: String?

    private let transcriptionService = TranscriptionService()

    init(recording: LMRecording) {
        self.recording = recording
    }

    var sortedSegments: [LMTranscriptSegment] {
        recording.segments.sorted { $0.startTime < $1.startTime }
    }

    func retranscribe(modelContext: ModelContext) async {
        guard let fileURL = recording.fileURL else {
            errorMessage = "Ses dosyasi bulunamadi"
            return
        }

        isRetranscribing = true
        errorMessage = nil

        do {
            let segments = try await transcriptionService.transcribeFile(at: fileURL)

            // Eski segmentleri sil
            for segment in recording.segments {
                modelContext.delete(segment)
            }
            recording.segments.removeAll()

            // Yeni segmentleri ekle
            for segmentData in segments {
                let segment = LMTranscriptSegment(
                    text: segmentData.text,
                    startTime: segmentData.startTime,
                    endTime: segmentData.endTime,
                    confidence: segmentData.confidence,
                    recording: recording
                )
                recording.segments.append(segment)
            }

            recording.isTranscribed = true
            try? modelContext.save()
        } catch {
            errorMessage = "Transkript hatasi: \(error.localizedDescription)"
        }

        isRetranscribing = false
    }
}
