import Foundation
import AVFoundation
import Combine

@Observable
final class AudioRecorderService: NSObject {
    var isRecording = false
    var isPaused = false
    var currentTime: TimeInterval = 0
    var audioLevel: Float = 0

    private var audioRecorder: AVAudioRecorder?
    private var meteringTimer: Timer?
    private var startTime: Date?
    private var accumulatedTime: TimeInterval = 0

    // MARK: - Audio Session

    func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Recording

    func startRecording(filename: String) throws -> URL {
        try configureAudioSession()

        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let recordingsDir = documentsURL.appendingPathComponent("Recordings", isDirectory: true)

        if !FileManager.default.fileExists(atPath: recordingsDir.path) {
            try FileManager.default.createDirectory(at: recordingsDir, withIntermediateDirectories: true)
        }

        let fileURL = recordingsDir.appendingPathComponent("\(filename).m4a")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 64000
        ]

        audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.isMeteringEnabled = true
        audioRecorder?.record()

        isRecording = true
        isPaused = false
        startTime = Date()
        accumulatedTime = 0

        startMetering()

        return fileURL
    }

    func pauseRecording() {
        guard isRecording, !isPaused else { return }
        audioRecorder?.pause()
        isPaused = true
        if let start = startTime {
            accumulatedTime += Date().timeIntervalSince(start)
        }
        startTime = nil
        stopMetering()
    }

    func resumeRecording() {
        guard isRecording, isPaused else { return }
        audioRecorder?.record()
        isPaused = false
        startTime = Date()
        startMetering()
    }

    func stopRecording() -> (url: URL, duration: TimeInterval)? {
        guard let recorder = audioRecorder else { return nil }

        let url = recorder.url
        if let start = startTime {
            accumulatedTime += Date().timeIntervalSince(start)
        }
        let duration = accumulatedTime

        recorder.stop()
        stopMetering()

        isRecording = false
        isPaused = false
        currentTime = 0
        audioLevel = 0
        startTime = nil
        accumulatedTime = 0
        audioRecorder = nil

        return (url, duration)
    }

    // MARK: - Metering

    private func startMetering() {
        meteringTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self, let recorder = self.audioRecorder else { return }
            recorder.updateMeters()

            let power = recorder.averagePower(forChannel: 0)
            // -160 (sessiz) ile 0 (max) arasini 0-1 araligina normalize et
            let normalizedPower = max(0, (power + 50) / 50)
            self.audioLevel = normalizedPower

            if let start = self.startTime {
                self.currentTime = self.accumulatedTime + Date().timeIntervalSince(start)
            }
        }
    }

    private func stopMetering() {
        meteringTimer?.invalidate()
        meteringTimer = nil
    }

    // MARK: - Helpers

    var formattedCurrentTime: String {
        let hours = Int(currentTime) / 3600
        let minutes = (Int(currentTime) % 3600) / 60
        let seconds = Int(currentTime) % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// MARK: - AVAudioRecorderDelegate

extension AudioRecorderService: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            isRecording = false
            isPaused = false
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        isRecording = false
        isPaused = false
    }
}
