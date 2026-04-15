import SwiftUI

struct RecordingControlsView: View {
    let state: RecordingViewModel.RecordingState
    let onStart: () -> Void
    let onPause: () -> Void
    let onResume: () -> Void
    let onStop: () -> Void
    let onBookmark: () -> Void

    var body: some View {
        HStack(spacing: 40) {
            switch state {
            case .idle:
                // Bos alan (denge icin)
                Color.clear.frame(width: 50, height: 50)

                // Kayit Baslat
                Button(action: onStart) {
                    Circle()
                        .fill(Color.lmAccent)
                        .frame(width: 80, height: 80)
                        .overlay {
                            Image(systemName: "mic.fill")
                                .font(.title)
                                .foregroundStyle(.white)
                        }
                        .shadow(color: Color.lmAccent.opacity(0.4), radius: 10)
                }

                Color.clear.frame(width: 50, height: 50)

            case .recording:
                // Yer Imi
                Button(action: onBookmark) {
                    VStack(spacing: 4) {
                        Image(systemName: "bookmark.fill")
                            .font(.title2)
                        Text("Isaretle")
                            .font(.caption2)
                    }
                    .foregroundStyle(Color.lmWarning)
                    .frame(width: 50, height: 50)
                }

                // Duraklat
                Button(action: onPause) {
                    Circle()
                        .fill(Color.lmPrimary)
                        .frame(width: 80, height: 80)
                        .overlay {
                            Image(systemName: "pause.fill")
                                .font(.title)
                                .foregroundStyle(.white)
                        }
                }

                // Durdur
                Button(action: onStop) {
                    VStack(spacing: 4) {
                        Image(systemName: "stop.fill")
                            .font(.title2)
                        Text("Bitir")
                            .font(.caption2)
                    }
                    .foregroundStyle(Color.lmAccent)
                    .frame(width: 50, height: 50)
                }

            case .paused:
                // Yer Imi
                Button(action: onBookmark) {
                    VStack(spacing: 4) {
                        Image(systemName: "bookmark.fill")
                            .font(.title2)
                        Text("Isaretle")
                            .font(.caption2)
                    }
                    .foregroundStyle(Color.lmWarning)
                    .frame(width: 50, height: 50)
                }

                // Devam Et
                Button(action: onResume) {
                    Circle()
                        .fill(Color.lmSuccess)
                        .frame(width: 80, height: 80)
                        .overlay {
                            Image(systemName: "play.fill")
                                .font(.title)
                                .foregroundStyle(.white)
                        }
                }

                // Durdur
                Button(action: onStop) {
                    VStack(spacing: 4) {
                        Image(systemName: "stop.fill")
                            .font(.title2)
                        Text("Bitir")
                            .font(.caption2)
                    }
                    .foregroundStyle(Color.lmAccent)
                    .frame(width: 50, height: 50)
                }

            case .saving:
                ProgressView("Kaydediliyor...")
                    .frame(width: 80, height: 80)
            }
        }
        .animation(.spring(duration: 0.3), value: state == .idle)
    }
}
