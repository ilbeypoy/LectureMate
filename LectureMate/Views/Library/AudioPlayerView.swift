import SwiftUI

struct AudioPlayerView: View {
    @Bindable var playerVM: PlayerViewModel

    var body: some View {
        VStack(spacing: 12) {
            // Ilerleme cubugu
            VStack(spacing: 4) {
                Slider(
                    value: Binding(
                        get: { playerVM.player.currentTime },
                        set: { playerVM.player.seek(to: $0) }
                    ),
                    in: 0...max(playerVM.player.duration, 1)
                )
                .tint(.lmPrimary)

                HStack {
                    Text(playerVM.player.formattedCurrentTime)
                    Spacer()
                    Text(playerVM.player.formattedDuration)
                }
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
            }

            // Kontroller
            HStack(spacing: 24) {
                // Hiz secici
                Menu {
                    ForEach(AudioPlayerService.availableRates, id: \.self) { rate in
                        Button {
                            playerVM.changeRate(rate)
                        } label: {
                            HStack {
                                Text(rateLabel(rate))
                                if rate == playerVM.selectedRate {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    Text(rateLabel(playerVM.selectedRate))
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray6))
                        .clipShape(Capsule())
                }

                // 15sn geri
                Button {
                    playerVM.player.skipBackward()
                } label: {
                    Image(systemName: "gobackward.15")
                        .font(.title3)
                }

                // Oynat/Duraklat
                Button {
                    playerVM.togglePlayPause()
                } label: {
                    Image(systemName: playerVM.player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(.lmPrimary)
                }

                // 15sn ileri
                Button {
                    playerVM.player.skipForward()
                } label: {
                    Image(systemName: "goforward.15")
                        .font(.title3)
                }

                Spacer()
                    .frame(width: 40)
            }
            .foregroundStyle(.primary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func rateLabel(_ rate: Float) -> String {
        if rate == Float(Int(rate)) {
            return "\(Int(rate))x"
        }
        return String(format: "%.1fx", rate)
    }
}
