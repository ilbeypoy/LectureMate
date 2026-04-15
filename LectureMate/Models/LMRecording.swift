import Foundation
import SwiftData

@Model
final class LMRecording {
    @Attribute(.unique) var id: UUID
    var title: String
    var aiSummary: String?
    var recordedAt: Date
    var duration: TimeInterval
    var fileRelativePath: String
    var isTranscribed: Bool

    var classRef: LMClass?
    var folder: LMFolder?

    @Relationship(deleteRule: .cascade, inverse: \LMTranscriptSegment.recording)
    var segments: [LMTranscriptSegment] = []

    @Relationship(deleteRule: .cascade, inverse: \LMChatMessage.recording)
    var chatMessages: [LMChatMessage] = []

    @Relationship(deleteRule: .cascade, inverse: \LMBookmark.recording)
    var bookmarks: [LMBookmark] = []

    init(title: String, duration: TimeInterval = 0, fileRelativePath: String, classRef: LMClass? = nil, folder: LMFolder? = nil) {
        self.id = UUID()
        self.title = title
        self.recordedAt = Date()
        self.duration = duration
        self.fileRelativePath = fileRelativePath
        self.isTranscribed = false
        self.classRef = classRef
        self.folder = folder
    }

    var fullTranscript: String {
        segments
            .sorted { $0.startTime < $1.startTime }
            .map(\.text)
            .joined(separator: " ")
    }

    var fileURL: URL? {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        return docs?.appendingPathComponent(fileRelativePath)
    }

    var formattedDuration: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        if hours > 0 {
            return String(format: "%dsa %ddk", hours, minutes)
        } else if minutes > 0 {
            return String(format: "%ddk %dsn", minutes, seconds)
        } else {
            return String(format: "%dsn", seconds)
        }
    }
}
