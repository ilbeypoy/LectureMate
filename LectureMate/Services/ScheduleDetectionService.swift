import Foundation

final class ScheduleDetectionService {

    enum RecordingSuggestion {
        case currentlyInClass(LMClass, LMScheduleEntry)
        case upcomingClass(LMClass, LMScheduleEntry, minutesUntil: Int)
        case noScheduledClass
    }

    func detectCurrentContext(classes: [LMClass], entries: [LMScheduleEntry]) -> RecordingSuggestion {
        let calendar = Calendar.current
        let now = Date()
        let currentDayOfWeek = calendar.component(.weekday, from: now)
        let currentTimeComponents = calendar.dateComponents([.hour, .minute], from: now)

        // Bugunun girisleri
        let todayEntries = entries.filter { $0.dayOfWeek == currentDayOfWeek }

        for entry in todayEntries {
            guard let classRef = entry.classRef else { continue }

            let startComponents = calendar.dateComponents([.hour, .minute], from: entry.startTime)
            let endComponents = calendar.dateComponents([.hour, .minute], from: entry.endTime)

            guard let currentMinutes = totalMinutes(from: currentTimeComponents),
                  let startMinutes = totalMinutes(from: startComponents),
                  let endMinutes = totalMinutes(from: endComponents) else { continue }

            // Su anda derste mi?
            if currentMinutes >= startMinutes && currentMinutes <= endMinutes {
                return .currentlyInClass(classRef, entry)
            }

            // 30 dk icinde ders var mi?
            let diff = startMinutes - currentMinutes
            if diff > 0 && diff <= 30 {
                return .upcomingClass(classRef, entry, minutesUntil: diff)
            }
        }

        return .noScheduledClass
    }

    private func totalMinutes(from components: DateComponents) -> Int? {
        guard let hour = components.hour, let minute = components.minute else { return nil }
        return hour * 60 + minute
    }
}
