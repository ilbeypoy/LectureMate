import Foundation

extension Date {
    var dayOfWeek: Int {
        Calendar.current.component(.weekday, from: self)
    }

    var dayName: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr-TR")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: self)
    }

    var shortDayName: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr-TR")
        formatter.dateFormat = "EEE"
        return formatter.string(from: self)
    }

    var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: self)
    }

    var dateString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr-TR")
        formatter.dateFormat = "dd MMMM yyyy"
        return formatter.string(from: self)
    }

    var shortDateString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr-TR")
        formatter.dateFormat = "dd.MM.yyyy"
        return formatter.string(from: self)
    }

    var relativeDateString: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "tr-TR")
        formatter.unitsStyle = .full
        return formatter.localizedString(for: self, relativeTo: Date())
    }

    static func timeOnly(hour: Int, minute: Int) -> Date {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? Date()
    }

    var hourAndMinute: (hour: Int, minute: Int) {
        let components = Calendar.current.dateComponents([.hour, .minute], from: self)
        return (components.hour ?? 0, components.minute ?? 0)
    }
}
