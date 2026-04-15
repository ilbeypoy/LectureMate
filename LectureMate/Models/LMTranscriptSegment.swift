import Foundation
import SwiftData

@Model
final class LMTranscriptSegment {
    @Attribute(.unique) var id: UUID
    var text: String
    var startTime: TimeInterval
    var endTime: TimeInterval
    var confidence: Float
    var recording: LMRecording?

    init(text: String, startTime: TimeInterval, endTime: TimeInterval, confidence: Float = 1.0, recording: LMRecording? = nil) {
        self.id = UUID()
        self.text = text
        self.startTime = startTime
        self.endTime = endTime
        self.confidence = confidence
        self.recording = recording
    }

    var formattedTimeRange: String {
        let startFormatted = formatTime(startTime)
        let endFormatted = formatTime(endTime)
        return "\(startFormatted) - \(endFormatted)"
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
