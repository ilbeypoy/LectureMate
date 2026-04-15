import Foundation

@MainActor
@Observable
final class PlayerViewModel {
    let player = AudioPlayerService()
    var isLoaded = false
    var errorMessage: String?
    var selectedRate: Float = 1.0

    func loadAudio(from url: URL) {
        do {
            try player.loadAudio(from: url)
            isLoaded = true
        } catch {
            errorMessage = "Ses dosyasi yuklenemedi: \(error.localizedDescription)"
        }
    }

    func togglePlayPause() {
        if player.isPlaying {
            player.pause()
        } else {
            player.play()
        }
    }

    func seekToTimestamp(_ timestamp: TimeInterval) {
        player.seek(to: timestamp)
        if !player.isPlaying {
            player.play()
        }
    }

    func changeRate(_ rate: Float) {
        selectedRate = rate
        player.setRate(rate)
    }

    func cleanup() {
        player.stop()
        isLoaded = false
    }
}
