import SwiftUI

struct RecordingRowView: View {
    let recording: LMRecording

    var body: some View {
        HStack(spacing: 12) {
            // Ders renk gostergesi
            RoundedRectangle(cornerRadius: 4)
                .fill(recording.classRef != nil
                      ? Color(hex: recording.classRef!.colorHex)
                      : Color.gray.opacity(0.3))
                .frame(width: 4, height: 50)

            VStack(alignment: .leading, spacing: 4) {
                Text(recording.title)
                    .font(.headline)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let className = recording.classRef?.name {
                        Text(className)
                            .font(.caption)
                            .foregroundStyle(Color.lmPrimary)
                    }

                    Text(recording.recordedAt.relativeDateString)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    Label(recording.formattedDuration, systemImage: "clock")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if recording.isTranscribed {
                        Label("Transkript", systemImage: "doc.text")
                            .font(.caption2)
                            .foregroundStyle(Color.lmSuccess)
                    }

                    if recording.aiSummary != nil {
                        Label("AI", systemImage: "sparkles")
                            .font(.caption2)
                            .foregroundStyle(Color.lmSecondary)
                    }

                    if !recording.bookmarks.isEmpty {
                        Label("\(recording.bookmarks.count)", systemImage: "bookmark.fill")
                            .font(.caption2)
                            .foregroundStyle(Color.lmWarning)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}
