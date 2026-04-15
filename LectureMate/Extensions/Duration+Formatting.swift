import Foundation

extension TimeInterval {
    var formattedDuration: String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60
        if hours > 0 {
            return String(format: "%dsa %ddk", hours, minutes)
        } else if minutes > 0 {
            return String(format: "%ddk %dsn", minutes, seconds)
        } else {
            return String(format: "%dsn", seconds)
        }
    }

    var formattedTimer: String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
