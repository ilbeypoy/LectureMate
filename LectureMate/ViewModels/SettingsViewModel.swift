import Foundation

@MainActor
@Observable
final class SettingsViewModel {
    var apiKey = ""
    var isTestingConnection = false
    var connectionTestResult: ConnectionTestResult?
    var autoTranscribe: Bool {
        didSet { UserDefaults.standard.set(autoTranscribe, forKey: Constants.autoTranscribeKey) }
    }
    var notificationsEnabled: Bool {
        didSet { UserDefaults.standard.set(notificationsEnabled, forKey: Constants.notificationsEnabledKey) }
    }

    enum ConnectionTestResult {
        case success
        case failure(String)
    }

    private let deepSeek: DeepSeekService

    init(deepSeek: DeepSeekService) {
        self.deepSeek = deepSeek
        self.autoTranscribe = UserDefaults.standard.bool(forKey: Constants.autoTranscribeKey)
        self.notificationsEnabled = UserDefaults.standard.bool(forKey: Constants.notificationsEnabledKey)

        // Mevcut API key'i yukle (maskelemek icin)
        if let existingKey = KeychainHelper.read(key: Constants.deepSeekAPIKeyName) {
            apiKey = existingKey
        }
    }

    var hasAPIKey: Bool {
        deepSeek.isConfigured
    }

    var maskedAPIKey: String {
        guard !apiKey.isEmpty else { return "" }
        if apiKey.count <= 8 { return String(repeating: "*", count: apiKey.count) }
        let prefix = String(apiKey.prefix(4))
        let suffix = String(apiKey.suffix(4))
        return "\(prefix)...\(suffix)"
    }

    func saveAPIKey() {
        let trimmed = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        deepSeek.saveAPIKey(trimmed)
    }

    func deleteAPIKey() {
        deepSeek.deleteAPIKey()
        apiKey = ""
        connectionTestResult = nil
    }

    func testConnection() async {
        isTestingConnection = true
        connectionTestResult = nil

        // Once anahtari kaydet
        saveAPIKey()

        let success = await deepSeek.testConnection()
        connectionTestResult = success ? .success : .failure("Baglanti kurulamadi. API anahtarini kontrol edin.")
        isTestingConnection = false
    }

    func toggleNotifications() async {
        if notificationsEnabled {
            let granted = await NotificationService.shared.requestPermission()
            if !granted {
                notificationsEnabled = false
            }
        } else {
            NotificationService.shared.removeAllReminders()
        }
    }

    var storageUsed: String {
        FileManager.default.formattedRecordingsSize
    }
}
