import Foundation

enum Constants {
    static let deepSeekAPIKeyName = "com.lecturemate.deepseek-api-key"
    static let recordingsDirectoryName = "Recordings"

    // UserDefaults Keys
    static let autoTranscribeKey = "autoTranscribe"
    static let notificationsEnabledKey = "notificationsEnabled"
    static let audioQualityKey = "audioQuality"
    static let appearanceModeKey = "appearanceMode"

    // Default Values
    static let defaultSessionRestartInterval: TimeInterval = 55
    static let upcomingClassThresholdMinutes = 30
    static let reminderMinutesBefore = 5
}
