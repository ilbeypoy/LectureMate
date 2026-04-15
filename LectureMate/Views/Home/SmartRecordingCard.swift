import SwiftUI

struct SmartRecordingCard: View {
    let suggestion: ScheduleDetectionService.RecordingSuggestion
    let onRecord: (LMClass?) -> Void
    let onChooseClass: () -> Void
    let onCustomRecord: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            switch suggestion {
            case .currentlyInClass(let classRef, let entry):
                currentClassView(classRef: classRef, entry: entry)

            case .upcomingClass(let classRef, let entry, let minutes):
                upcomingClassView(classRef: classRef, entry: entry, minutes: minutes)

            case .noScheduledClass:
                noClassView
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.lmPrimary.opacity(0.1), Color.lmSecondary.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    // MARK: - Su Anda Derste

    private func currentClassView(classRef: LMClass, entry: LMScheduleEntry) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "waveform.circle.fill")
                    .font(.title)
                    .foregroundStyle(Color.lmPrimary)
                    .symbolEffect(.pulse)
                VStack(alignment: .leading) {
                    Text("Su Anda Derstesin")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(classRef.name)
                        .font(.title3.bold())
                }
                Spacer()
            }

            if let location = entry.location {
                HStack {
                    Image(systemName: "location.fill")
                        .font(.caption)
                    Text(location)
                        .font(.caption)
                    Spacer()
                }
                .foregroundStyle(.secondary)
            }

            Button {
                onRecord(classRef)
            } label: {
                Label("Kayit Baslat", systemImage: "mic.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.lmAccent)

            HStack(spacing: 12) {
                Button("Baska Ders", action: onChooseClass)
                    .font(.subheadline)
                Button("Serbest Kayit", action: onCustomRecord)
                    .font(.subheadline)
            }
            .foregroundStyle(Color.lmPrimary)
        }
    }

    // MARK: - Yaklasan Ders

    private func upcomingClassView(classRef: LMClass, entry: LMScheduleEntry, minutes: Int) -> some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "clock.badge.exclamationmark.fill")
                    .font(.title)
                    .foregroundStyle(Color.lmWarning)
                VStack(alignment: .leading) {
                    Text("\(minutes) dakika sonra")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(classRef.name)
                        .font(.title3.bold())
                }
                Spacer()
            }

            Button {
                onRecord(classRef)
            } label: {
                Label("Simdi Kayit Baslat", systemImage: "mic.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.lmPrimary)

            HStack(spacing: 12) {
                Button("Baska Ders", action: onChooseClass)
                    .font(.subheadline)
                Button("Serbest Kayit", action: onCustomRecord)
                    .font(.subheadline)
            }
            .foregroundStyle(Color.lmPrimary)
        }
    }

    // MARK: - Program Disi

    private var noClassView: some View {
        VStack(spacing: 12) {
            Image(systemName: "mic.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(Color.lmPrimary)

            Text("Ses Kaydi Baslat")
                .font(.title3.bold())

            Text("Su anda programda ders yok.\nSerbest kayit baslatabilir veya ders secebilirsin.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
                Button {
                    onCustomRecord()
                } label: {
                    Label("Serbest Kayit", systemImage: "mic.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.lmPrimary)

                Button {
                    onChooseClass()
                } label: {
                    Label("Ders Sec", systemImage: "book.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .tint(Color.lmSecondary)
            }
        }
    }
}
