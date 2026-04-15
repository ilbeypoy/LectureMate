import Foundation
import SwiftData

@Model
final class LMClass {
    @Attribute(.unique) var id: UUID
    var name: String
    var professorName: String?
    var colorHex: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \LMScheduleEntry.classRef)
    var scheduleEntries: [LMScheduleEntry] = []

    @Relationship(deleteRule: .nullify, inverse: \LMRecording.classRef)
    var recordings: [LMRecording] = []

    init(name: String, professorName: String? = nil, colorHex: String = "#007AFF") {
        self.id = UUID()
        self.name = name
        self.professorName = professorName
        self.colorHex = colorHex
        self.createdAt = Date()
    }
}
