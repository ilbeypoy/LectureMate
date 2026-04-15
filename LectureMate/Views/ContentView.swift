import SwiftUI

struct ContentView: View {
    @State private var deepSeekService = DeepSeekService()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Ana Sayfa", systemImage: "house.fill")
                }
                .tag(0)

            RecordingsListView()
                .tabItem {
                    Label("Kutuphane", systemImage: "tray.full.fill")
                }
                .tag(1)

            ScheduleView()
                .tabItem {
                    Label("Program", systemImage: "calendar")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Ayarlar", systemImage: "gear")
                }
                .tag(3)
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
