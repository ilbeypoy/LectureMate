import SwiftUI
import SwiftData

struct HomeView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = HomeViewModel()
    @State private var showRecording = false
    @State private var showClassPicker = false
    @State private var selectedClassForRecording: LMClass?

    @Query(sort: \LMClass.name) private var classes: [LMClass]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Istatistik Karti
                    statsCard

                    // Akilli Kayit Onerisi
                    SmartRecordingCard(
                        suggestion: viewModel.suggestion,
                        onRecord: { classRef in
                            selectedClassForRecording = classRef
                            showRecording = true
                        },
                        onChooseClass: {
                            showClassPicker = true
                        },
                        onCustomRecord: {
                            selectedClassForRecording = nil
                            showRecording = true
                        }
                    )

                    // Son Kayitlar
                    if !viewModel.recentRecordings.isEmpty {
                        recentRecordingsSection
                    }
                }
                .padding()
            }
            .background(Color.lmBackground)
            .navigationTitle("LectureMate")
            .onAppear {
                viewModel.refresh(modelContext: modelContext)
            }
            .fullScreenCover(isPresented: $showRecording) {
                RecordingView(selectedClass: selectedClassForRecording)
            }
            .sheet(isPresented: $showClassPicker) {
                classPickerSheet
            }
        }
    }

    // MARK: - Istatistik Karti

    private var statsCard: some View {
        HStack(spacing: 20) {
            StatItem(
                icon: "mic.fill",
                value: "\(viewModel.totalRecordingCount)",
                label: "Kayit"
            )
            StatItem(
                icon: "clock.fill",
                value: viewModel.formattedTotalDuration,
                label: "Toplam Sure"
            )
            StatItem(
                icon: "doc.text.fill",
                value: FileManager.default.formattedRecordingsSize,
                label: "Depolama"
            )
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Son Kayitlar

    private var recentRecordingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Son Kayitlar")
                    .font(.headline)
                Spacer()
                NavigationLink("Tumunu Gor") {
                    RecordingsListView()
                }
                .font(.subheadline)
            }

            ForEach(viewModel.recentRecordings) { recording in
                NavigationLink {
                    RecordingDetailView(recording: recording)
                } label: {
                    RecordingRowView(recording: recording)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Ders Secici

    private var classPickerSheet: some View {
        NavigationStack {
            List(classes) { classItem in
                Button {
                    selectedClassForRecording = classItem
                    showClassPicker = false
                    showRecording = true
                } label: {
                    HStack {
                        Circle()
                            .fill(Color(hex: classItem.colorHex))
                            .frame(width: 12, height: 12)
                        Text(classItem.name)
                        Spacer()
                        if let prof = classItem.professorName {
                            Text(prof)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Ders Sec")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") { showClassPicker = false }
                }
            }
            .overlay {
                if classes.isEmpty {
                    EmptyStateView(
                        icon: "book.closed",
                        title: "Ders Yok",
                        message: "Once Program sekmesinden ders ekleyin"
                    )
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Stat Item

struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color.lmPrimary)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
