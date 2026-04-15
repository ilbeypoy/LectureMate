import SwiftUI
import SwiftData

struct RecordingsListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LMRecording.recordedAt, order: .reverse) private var recordings: [LMRecording]
    @Query(sort: \LMClass.name) private var classes: [LMClass]
    @Query(sort: \LMFolder.name) private var folders: [LMFolder]
    @State private var viewModel = RecordingsListViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Arama
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Kayitlarda ara...", text: $viewModel.searchText)
                }
                .padding(10)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
                .padding(.top, 8)

                // Filtre
                Picker("Filtre", selection: $viewModel.filterMode) {
                    ForEach(RecordingsListViewModel.FilterMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Ders/Klasor secici (filtre aktifse)
                if viewModel.filterMode == .byClass && !classes.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(classes) { classItem in
                                Button {
                                    viewModel.selectedClass = classItem
                                } label: {
                                    HStack(spacing: 4) {
                                        Circle()
                                            .fill(Color(hex: classItem.colorHex))
                                            .frame(width: 8, height: 8)
                                        Text(classItem.name)
                                            .font(.caption)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(viewModel.selectedClass?.id == classItem.id ? Color.lmPrimary.opacity(0.2) : Color(.systemGray6))
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                // Kayit Listesi
                let filtered = viewModel.filteredRecordings(recordings)
                if filtered.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: "waveform",
                        title: "Kayit Bulunamadi",
                        message: viewModel.searchText.isEmpty
                            ? "Ilk kaydinizi yapmak icin Ana Sayfa'ya gidin"
                            : "Aramanizla eslesen kayit yok"
                    )
                    Spacer()
                } else {
                    List {
                        ForEach(filtered) { recording in
                            NavigationLink {
                                RecordingDetailView(recording: recording)
                            } label: {
                                RecordingRowView(recording: recording)
                            }
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                viewModel.deleteRecording(filtered[index], modelContext: modelContext)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Kutuphane")
        }
    }
}
