import SwiftUI

struct ClassDetailView: View {
    let classRef: LMClass

    var body: some View {
        List {
            // Ders bilgileri
            Section("Ders Bilgileri") {
                HStack {
                    Circle()
                        .fill(Color(hex: classRef.colorHex))
                        .frame(width: 14, height: 14)
                    Text(classRef.name)
                        .font(.headline)
                }

                if let professor = classRef.professorName {
                    Label(professor, systemImage: "person")
                }

                Label("\(classRef.recordings.count) kayit", systemImage: "mic")
            }

            // Program
            if !classRef.scheduleEntries.isEmpty {
                Section("Haftalik Program") {
                    ForEach(classRef.scheduleEntries.sorted(by: { $0.dayOfWeek < $1.dayOfWeek })) { entry in
                        HStack {
                            Text(entry.dayName)
                                .font(.subheadline.bold())
                                .frame(width: 80, alignment: .leading)
                            Text("\(entry.startTime.timeString) - \(entry.endTime.timeString)")
                                .font(.subheadline)
                            if let location = entry.location {
                                Spacer()
                                Text(location)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }

            // Kayitlar
            if !classRef.recordings.isEmpty {
                Section("Kayitlar") {
                    ForEach(classRef.recordings.sorted(by: { $0.recordedAt > $1.recordedAt })) { recording in
                        NavigationLink {
                            RecordingDetailView(recording: recording)
                        } label: {
                            RecordingRowView(recording: recording)
                        }
                    }
                }
            }
        }
        .navigationTitle(classRef.name)
    }
}
