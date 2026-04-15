import SwiftUI
import SwiftData

@main
struct LectureMateApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            LMClass.self,
            LMScheduleEntry.self,
            LMRecording.self,
            LMTranscriptSegment.self,
            LMChatMessage.self,
            LMFolder.self,
            LMBookmark.self
        ])
    }
}
