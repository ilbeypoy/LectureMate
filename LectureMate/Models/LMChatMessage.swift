import Foundation
import SwiftData

@Model
final class LMChatMessage {
    @Attribute(.unique) var id: UUID
    var role: String // "user" veya "assistant"
    var content: String
    var timestamp: Date
    var recording: LMRecording?

    init(role: String, content: String, recording: LMRecording? = nil) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = Date()
        self.recording = recording
    }

    var isUser: Bool {
        role == "user"
    }
}
