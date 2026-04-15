import Foundation
import SwiftData

@Observable
final class HomeViewModel {
    var suggestion: ScheduleDetectionService.RecordingSuggestion = .noScheduledClass
    var recentRecordings: [LMRecording] = []
    var totalRecordingCount = 0
    var totalDuration: TimeInterval = 0

    private let scheduleDetection = ScheduleDetectionService()

    func refresh(modelContext: ModelContext) {
        // Son kayitlari getir
        let descriptor = FetchDescriptor<LMRecording>(
            sortBy: [SortDescriptor(\.recordedAt, order: .reverse)]
        )
        if let recordings = try? modelContext.fetch(descriptor) {
            recentRecordings = Array(recordings.prefix(5))
            totalRecordingCount = recordings.count
            totalDuration = recordings.reduce(0) { $0 + $1.duration }
        }

        // Ders tespiti
        let classDescriptor = FetchDescriptor<LMClass>()
        let entryDescriptor = FetchDescriptor<LMScheduleEntry>()

        if let classes = try? modelContext.fetch(classDescriptor),
           let entries = try? modelContext.fetch(entryDescriptor) {
            suggestion = scheduleDetection.detectCurrentContext(classes: classes, entries: entries)
        }
    }

    var formattedTotalDuration: String {
        totalDuration.formattedDuration
    }
}
