import Foundation
import SwiftData

@Model
final class LMFolder {
    @Attribute(.unique) var id: UUID
    var name: String
    var iconName: String
    var createdAt: Date

    @Relationship(deleteRule: .nullify, inverse: \LMRecording.folder)
    var recordings: [LMRecording] = []

    init(name: String, iconName: String = "folder.fill") {
        self.id = UUID()
        self.name = name
        self.iconName = iconName
        self.createdAt = Date()
    }
}
