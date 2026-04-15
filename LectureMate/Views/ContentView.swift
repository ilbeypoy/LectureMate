import SwiftUI

struct ContentView: View {
    @State private var deepSeekService = DeepSeekService()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Ana Sayfa", systemImage: "house.fill", value: 0) {
                HomeView()
            }

            Tab("Kutuphane", systemImage: "tray.full.fill", value: 1) {
                RecordingsListView()
            }

            Tab("Program", systemImage: "calendar", value: 2) {
                ScheduleView()
            }

            Tab("Ayarlar", systemImage: "gear", value: 3) {
                SettingsView()
            }
        }
        .tint(Color.lmPrimary)
        .environment(deepSeekService)
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [
            LMClass.self,
            LMScheduleEntry.self,
            LMRecording.self,
            LMTranscriptSegment.self,
            LMChatMessage.self,
            LMFolder.self,
            LMBookmark.self
        ], inMemory: true)
}
