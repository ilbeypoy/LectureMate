import SwiftUI

struct TranscriptView: View {
    let segments: [LMTranscriptSegment]
    let onSegmentTap: (LMTranscriptSegment) -> Void
    let currentTime: TimeInterval

    var body: some View {
        LazyVStack(alignment: .leading, spacing: 4) {
            ForEach(segments) { segment in
                Button {
                    onSegmentTap(segment)
                } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Text(formatTime(segment.startTime))
                            .font(.caption2.monospaced())
                            .foregroundStyle(Color.lmPrimary)
                            .frame(width: 40, alignment: .trailing)

                        Text(segment.text)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 8)
                    .background(isCurrentSegment(segment) ? Color.lmPrimary.opacity(0.1) : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func isCurrentSegment(_ segment: LMTranscriptSegment) -> Bool {
        currentTime >= segment.startTime && currentTime <= segment.endTime
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
