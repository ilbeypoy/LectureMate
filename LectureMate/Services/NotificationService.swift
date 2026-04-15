import Foundation
import UserNotifications

final class NotificationService {

    static let shared = NotificationService()

    private init() {}

    // MARK: - Izin Isteme

    func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    // MARK: - Ders Hatirlaticilari

    func scheduleClassReminders(for entries: [LMScheduleEntry]) {
        // Onceki tum hatirlaticilari temizle
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()

        for entry in entries {
            guard let classRef = entry.classRef else { continue }
            scheduleReminder(for: entry, className: classRef.name)
        }
    }

    private func scheduleReminder(for entry: LMScheduleEntry, className: String) {
        let calendar = Calendar.current

        let startComponents = calendar.dateComponents([.hour, .minute], from: entry.startTime)
        guard let hour = startComponents.hour, let minute = startComponents.minute else { return }

        // Dersten 5 dk once bildirim
        var reminderMinute = minute - 5
        var reminderHour = hour
        if reminderMinute < 0 {
            reminderMinute += 60
            reminderHour -= 1
        }
        if reminderHour < 0 { return }

        var dateComponents = DateComponents()
        dateComponents.weekday = entry.dayOfWeek
        dateComponents.hour = reminderHour
        dateComponents.minute = reminderMinute

        let content = UNMutableNotificationContent()
        content.title = "Ders Hatirlatici"
        content.body = "\(className) dersi 5 dakika sonra basliyor. Kayit icin hazir misin?"
        content.sound = .default
        content.categoryIdentifier = "LECTURE_REMINDER"
        content.userInfo = ["classId": entry.classRef?.id.uuidString ?? ""]

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(
            identifier: "reminder-\(entry.id.uuidString)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    // MARK: - Tum Bildirimleri Temizle

    func removeAllReminders() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    func removePendingReminders(for classId: UUID) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let idsToRemove = requests
                .filter { $0.content.userInfo["classId"] as? String == classId.uuidString }
                .map(\.identifier)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: idsToRemove)
        }
    }
}
