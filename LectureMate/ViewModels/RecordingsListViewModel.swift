import Foundation
import SwiftData

@Observable
final class RecordingsListViewModel {
    var searchText = ""
    var filterMode: FilterMode = .all
    var selectedClass: LMClass?
    var selectedFolder: LMFolder?

    enum FilterMode: String, CaseIterable {
        case all = "Tumu"
        case byClass = "Derse Gore"
        case byFolder = "Klasore Gore"
    }

    func filteredRecordings(_ recordings: [LMRecording]) -> [LMRecording] {
        var result = recordings

        // Arama filtresi
        if !searchText.isEmpty {
            result = result.filter { recording in
                recording.title.localizedCaseInsensitiveContains(searchText) ||
                recording.fullTranscript.localizedCaseInsensitiveContains(searchText) ||
                (recording.classRef?.name.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        // Kategori filtresi
        switch filterMode {
        case .all:
            break
        case .byClass:
            if let selected = selectedClass {
                result = result.filter { $0.classRef?.id == selected.id }
            }
        case .byFolder:
            if let selected = selectedFolder {
                result = result.filter { $0.folder?.id == selected.id }
            }
        }

        return result.sorted { $0.recordedAt > $1.recordedAt }
    }

    func deleteRecording(_ recording: LMRecording, modelContext: ModelContext) {
        // Ses dosyasini sil
        FileManager.default.deleteRecording(at: recording.fileRelativePath)
        // Veritabanindan sil
        modelContext.delete(recording)
        try? modelContext.save()
    }
}
