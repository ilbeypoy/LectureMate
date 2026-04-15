import Foundation
import SwiftUI
import SwiftData

@Observable
final class ScheduleViewModel {
    var selectedDay: Int = Calendar.current.component(.weekday, from: Date())
    var showingAddEntry = false
    var showingAddClass = false

    // Yeni giris formu
    var newClassName = ""
    var newProfessorName = ""
    var newStartTime = Date.timeOnly(hour: 9, minute: 0)
    var newEndTime = Date.timeOnly(hour: 10, minute: 30)
    var newLocation = ""
    var newClassColor = Color.classColors[0]
    var editingEntry: LMScheduleEntry?
    var selectedClassForEntry: LMClass?

    static let weekDays: [(id: Int, name: String, short: String)] = [
        (2, "Pazartesi", "Pzt"),
        (3, "Sali", "Sal"),
        (4, "Carsamba", "Car"),
        (5, "Persembe", "Per"),
        (6, "Cuma", "Cum"),
        (7, "Cumartesi", "Cmt"),
        (1, "Pazar", "Paz")
    ]

    func entriesForSelectedDay(_ entries: [LMScheduleEntry]) -> [LMScheduleEntry] {
        entries
            .filter { $0.dayOfWeek == selectedDay }
            .sorted { $0.startTime < $1.startTime }
    }

    func addClass(modelContext: ModelContext) -> LMClass {
        let newClass = LMClass(
            name: newClassName,
            professorName: newProfessorName.isEmpty ? nil : newProfessorName,
            colorHex: newClassColor
        )
        modelContext.insert(newClass)
        try? modelContext.save()

        // Formu sifirla
        newClassName = ""
        newProfessorName = ""
        newClassColor = Color.classColors.randomElement() ?? Color.classColors[0]

        return newClass
    }

    func addScheduleEntry(for classRef: LMClass, modelContext: ModelContext) {
        let entry = LMScheduleEntry(
            dayOfWeek: selectedDay,
            startTime: newStartTime,
            endTime: newEndTime,
            location: newLocation.isEmpty ? nil : newLocation,
            classRef: classRef
        )
        modelContext.insert(entry)
        try? modelContext.save()

        // Bildirimleri guncelle
        let descriptor = FetchDescriptor<LMScheduleEntry>()
        if let allEntries = try? modelContext.fetch(descriptor) {
            NotificationService.shared.scheduleClassReminders(for: allEntries)
        }

        resetForm()
    }

    func deleteEntry(_ entry: LMScheduleEntry, modelContext: ModelContext) {
        modelContext.delete(entry)
        try? modelContext.save()
    }

    func resetForm() {
        newStartTime = Date.timeOnly(hour: 9, minute: 0)
        newEndTime = Date.timeOnly(hour: 10, minute: 30)
        newLocation = ""
        selectedClassForEntry = nil
        editingEntry = nil
    }
}
