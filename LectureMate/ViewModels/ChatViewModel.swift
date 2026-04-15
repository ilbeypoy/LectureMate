import Foundation
import SwiftData

@Observable
final class ChatViewModel {
    var messages: [LMChatMessage] = []
    var inputText = ""
    var isLoading = false
    var streamingResponse = ""
    var errorMessage: String?

    let recording: LMRecording
    private let deepSeek: DeepSeekService

    init(recording: LMRecording, deepSeek: DeepSeekService) {
        self.recording = recording
        self.deepSeek = deepSeek
        self.messages = recording.chatMessages.sorted { $0.timestamp < $1.timestamp }
    }

    func sendMessage(modelContext: ModelContext) async {
        let question = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty else { return }

        // Kullanici mesajini ekle
        let userMessage = LMChatMessage(role: "user", content: question, recording: recording)
        modelContext.insert(userMessage)
        recording.chatMessages.append(userMessage)
        messages.append(userMessage)
        inputText = ""
        isLoading = true
        streamingResponse = ""
        errorMessage = nil

        do {
            // Gecmis mesajlari hazirla
            let history = messages.dropLast().map { msg in
                DeepSeekService.ChatHistoryItem(role: msg.role, content: msg.content)
            }

            // Streaming yanit
            var fullResponse = ""
            let stream = deepSeek.askQuestionStreaming(
                question,
                context: recording.fullTranscript,
                history: Array(history)
            )

            for try await chunk in stream {
                fullResponse += chunk
                streamingResponse = fullResponse
            }

            // Asistan mesajini kaydet
            let assistantMessage = LMChatMessage(role: "assistant", content: fullResponse, recording: recording)
            modelContext.insert(assistantMessage)
            recording.chatMessages.append(assistantMessage)
            messages.append(assistantMessage)
            streamingResponse = ""
            try? modelContext.save()
        } catch {
            errorMessage = "Yanit alinamadi: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func clearChat(modelContext: ModelContext) {
        for message in messages {
            modelContext.delete(message)
        }
        recording.chatMessages.removeAll()
        messages.removeAll()
        try? modelContext.save()
    }
}
