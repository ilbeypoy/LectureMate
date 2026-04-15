import Foundation
import SwiftData

@Model
final class LMScheduleEntry {
    @Attribute(.unique) var id: UUID
    var dayOfWeek: Int // 1=Pazar, 2=Pazartesi, ... 7=Cumartesi
    var startTime: Date // Sadece saat bilesi kullanilir
    var endTime: Date
    var location: String?
    var classRef: LMClass?

    init(dayOfWeek: Int, startTime: Date, endTime: Date, location: String? = nil, classRef: LMClass? = nil) {
        self.id = UUID()
        self.dayOfWeek = dayOfWeek
        self.startTime = startTime
        self.endTime = endTime
        self.location = location
        self.classRef = classRef
    }

    var dayName: String {
        let days = ["", "Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"]
        guard dayOfWeek >= 1, dayOfWeek <= 7 else { return "" }
        return days[dayOfWeek]
    }
}
