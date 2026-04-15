import Foundation
import SwiftData

@Model
final class LMBookmark {
    @Attribute(.unique) var id: UUID
    var label: String?
    var timestamp: TimeInterval
    var createdAt: Date
    var recording: LMRecording?

    init(timestamp: TimeInterval, label: String? = nil, recording: LMRecording? = nil) {
        self.id = UUID()
        self.timestamp = timestamp
        self.label = label
        self.createdAt = Date()
        self.recording = recording
    }

    var formattedTimestamp: String {
        let minutes = Int(timestamp) / 60
        let seconds = Int(timestamp) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
