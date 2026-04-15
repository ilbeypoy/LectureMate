import SwiftUI

struct LiveWaveformView: View {
    let audioLevel: Float
    let isRecording: Bool

    @State private var barHeights: [CGFloat] = Array(repeating: 0.1, count: 30)

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<barHeights.count, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(barColor(for: barHeights[index]))
                    .frame(width: 4, height: max(4, barHeights[index] * 80))
            }
        }
        .onChange(of: audioLevel) { _, newValue in
            if isRecording {
                updateBars(with: newValue)
            }
        }
        .onChange(of: isRecording) { _, recording in
            if !recording {
                resetBars()
            }
        }
    }

    private func barColor(for height: CGFloat) -> Color {
        if height > 0.7 {
            return Color.lmAccent
        } else if height > 0.4 {
            return Color.lmPrimary
        } else {
            return Color.lmPrimary.opacity(0.5)
        }
    }

    private func updateBars(with level: Float) {
        withAnimation(.easeOut(duration: 0.05)) {
            // Barlari sola kaydir
            for i in 0..<barHeights.count - 1 {
                barHeights[i] = barHeights[i + 1]
            }
            // Son bara yeni degeri ata (biraz rastgelelik ekle)
            let variation = CGFloat.random(in: -0.1...0.1)
            barHeights[barHeights.count - 1] = max(0.05, CGFloat(level) + variation)
        }
    }

    private func resetBars() {
        withAnimation(.easeOut(duration: 0.5)) {
            barHeights = Array(repeating: 0.1, count: 30)
        }
    }
}
