import SwiftUI
import SwiftData

struct FolderListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LMFolder.name) private var folders: [LMFolder]
    @State private var showNewFolder = false
    @State private var newFolderName = ""

    var body: some View {
        List {
            ForEach(folders) { folder in
                NavigationLink {
                    FolderDetailView(folder: folder)
                } label: {
                    HStack {
                        Image(systemName: folder.iconName)
                            .foregroundStyle(.lmPrimary)
                        Text(folder.name)
                        Spacer()
                        Text("\(folder.recordings.count)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .onDelete { indexSet in
                for index in indexSet {
                    modelContext.delete(folders[index])
                }
                try? modelContext.save()
            }
        }
        .navigationTitle("Klasorler")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showNewFolder = true
                } label: {
                    Image(systemName: "folder.badge.plus")
                }
            }
        }
        .alert("Yeni Klasor", isPresented: $showNewFolder) {
            TextField("Klasor adi", text: $newFolderName)
            Button("Olustur") {
                guard !newFolderName.isEmpty else { return }
                let folder = LMFolder(name: newFolderName)
                modelContext.insert(folder)
                try? modelContext.save()
                newFolderName = ""
            }
            Button("Iptal", role: .cancel) { newFolderName = "" }
        }
        .overlay {
            if folders.isEmpty {
                EmptyStateView(
                    icon: "folder",
                    title: "Klasor Yok",
                    message: "Kayitlarinizi duzenlemek icin klasor olusturun"
                )
            }
        }
    }
}

struct FolderDetailView: View {
    let folder: LMFolder

    var body: some View {
        List {
            ForEach(folder.recordings.sorted(by: { $0.recordedAt > $1.recordedAt })) { recording in
                NavigationLink {
                    RecordingDetailView(recording: recording)
                } label: {
                    RecordingRowView(recording: recording)
                }
            }
        }
        .navigationTitle(folder.name)
        .overlay {
            if folder.recordings.isEmpty {
                EmptyStateView(
                    icon: "waveform",
                    title: "Kayit Yok",
                    message: "Bu klasorde henuz kayit bulunmuyor"
                )
            }
        }
    }
}
