import Foundation

extension FileManager {
    var documentsDirectory: URL {
        urls(for: .documentDirectory, in: .userDomainMask).first!
    }

    var recordingsDirectory: URL {
        let dir = documentsDirectory.appendingPathComponent(Constants.recordingsDirectoryName, isDirectory: true)
        if !fileExists(atPath: dir.path) {
            try? createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    func recordingURL(for filename: String) -> URL {
        recordingsDirectory.appendingPathComponent(filename)
    }

    func relativeRecordingPath(for filename: String) -> String {
        "\(Constants.recordingsDirectoryName)/\(filename)"
    }

    func deleteRecording(at relativePath: String) {
        let url = documentsDirectory.appendingPathComponent(relativePath)
        try? removeItem(at: url)
    }

    var totalRecordingsSize: Int64 {
        let dir = recordingsDirectory
        guard let enumerator = enumerator(at: dir, includingPropertiesForKeys: [.fileSizeKey]) else { return 0 }
        var total: Int64 = 0
        for case let fileURL as URL in enumerator {
            let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey])
            total += Int64(resourceValues?.fileSize ?? 0)
        }
        return total
    }

    var formattedRecordingsSize: String {
        let bytes = totalRecordingsSize
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}
