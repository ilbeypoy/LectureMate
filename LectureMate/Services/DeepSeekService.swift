import Foundation

@Observable
final class DeepSeekService {
    var isConfigured: Bool {
        guard let key = apiKey else { return false }
        return !key.isEmpty
    }

    private var apiKey: String? {
        KeychainHelper.read(key: Constants.deepSeekAPIKeyName)
    }

    private let baseURL = "https://api.deepseek.com"
    private let model = "deepseek-chat"

    // MARK: - API Key Yonetimi

    func saveAPIKey(_ key: String) {
        KeychainHelper.save(key: Constants.deepSeekAPIKeyName, value: key)
    }

    func deleteAPIKey() {
        KeychainHelper.delete(key: Constants.deepSeekAPIKeyName)
    }

    func testConnection() async -> Bool {
        do {
            let _ = try await sendChatRequest(
                messages: [ChatMessage(role: "user", content: "Merhaba")],
                maxTokens: 10
            )
            return true
        } catch {
            return false
        }
    }

    // MARK: - Baslik Olusturma

    func generateTitle(for transcript: String) async throws -> String {
        let truncated = String(transcript.prefix(3000))
        let messages = [
            ChatMessage(role: "system", content: "Sen bir ders notu asistanisin. Verilen ders transkripti icin kisa ve aciklayici bir baslik olustur. Sadece basligi yaz, baska bir sey ekleme. Baslik 5-10 kelime olmali."),
            ChatMessage(role: "user", content: "Bu ders transkriptine bir baslik olustur:\n\n\(truncated)")
        ]
        return try await sendChatRequest(messages: messages, maxTokens: 50)
    }

    // MARK: - Ozet Olusturma

    func generateSummary(for transcript: String) async throws -> String {
        let truncated = String(transcript.prefix(8000))
        let messages = [
            ChatMessage(role: "system", content: "Sen bir ders notu asistanisin. Verilen ders transkriptinin ozetini madde isaretleri ile olustur. 3-5 madde ile ana konulari ozetle. Turkce yaz."),
            ChatMessage(role: "user", content: "Bu ders transkriptini ozetle:\n\n\(truncated)")
        ]
        return try await sendChatRequest(messages: messages, maxTokens: 500)
    }

    // MARK: - Soru-Cevap

    func askQuestion(_ question: String, context: String, history: [ChatHistoryItem] = []) async throws -> String {
        let truncatedContext = String(context.prefix(10000))

        var messages: [ChatMessage] = [
            ChatMessage(role: "system", content: """
                Sen bir ders calismsa asistanisin. Asagidaki ders transkriptine dayanarak ogrencinin sorularini yanitla.
                SADECE transkriptte bulunan bilgilere dayanarak cevap ver.
                Transkriptte bulunmayan bilgiler icin "Bu bilgi ders kaydinda bulunamiyor" de.
                Turkce cevap ver.

                DERS TRANSKRIPTI:
                \(truncatedContext)
                """)
        ]

        for item in history {
            messages.append(ChatMessage(role: item.role, content: item.content))
        }

        messages.append(ChatMessage(role: "user", content: question))

        return try await sendChatRequest(messages: messages, maxTokens: 1000)
    }

    // MARK: - Streaming Soru-Cevap

    func askQuestionStreaming(_ question: String, context: String, history: [ChatHistoryItem] = []) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let truncatedContext = String(context.prefix(10000))

                    var messages: [ChatMessage] = [
                        ChatMessage(role: "system", content: """
                            Sen bir ders calismsa asistanisin. Asagidaki ders transkriptine dayanarak ogrencinin sorularini yanitla.
                            SADECE transkriptte bulunan bilgilere dayanarak cevap ver.
                            Turkce cevap ver.

                            DERS TRANSKRIPTI:
                            \(truncatedContext)
                            """)
                    ]

                    for item in history {
                        messages.append(ChatMessage(role: item.role, content: item.content))
                    }
                    messages.append(ChatMessage(role: "user", content: question))

                    let request = try self.buildRequest(messages: messages, maxTokens: 1000, stream: true)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)

                    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                        throw DeepSeekError.apiError("API hatasi")
                    }

                    for try await line in bytes.lines {
                        guard line.hasPrefix("data: ") else { continue }
                        let jsonString = String(line.dropFirst(6))
                        if jsonString == "[DONE]" { break }

                        guard let data = jsonString.data(using: .utf8),
                              let chunk = try? JSONDecoder().decode(StreamChunk.self, from: data),
                              let content = chunk.choices.first?.delta.content else { continue }

                        continuation.yield(content)
                    }

                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    // MARK: - Calisma Karti Olusturma

    func generateFlashcards(from transcript: String) async throws -> [Flashcard] {
        let truncated = String(transcript.prefix(8000))
        let messages = [
            ChatMessage(role: "system", content: """
                Sen bir ders calismsa asistanisin. Verilen ders transkriptinden calisma kartlari (flashcards) olustur.
                Her kart bir soru ve cevap icermeli. 5-10 kart olustur.
                Yaniti SADECE su JSON formatinda ver, baska bir sey ekleme:
                [{"question": "Soru metni", "answer": "Cevap metni"}]
                """),
            ChatMessage(role: "user", content: "Bu transkriptten calisma kartlari olustur:\n\n\(truncated)")
        ]
        let response = try await sendChatRequest(messages: messages, maxTokens: 2000)

        guard let data = response.data(using: .utf8),
              let cards = try? JSONDecoder().decode([Flashcard].self, from: data) else {
            throw DeepSeekError.parseError
        }
        return cards
    }

    // MARK: - Network

    private func sendChatRequest(messages: [ChatMessage], maxTokens: Int) async throws -> String {
        let request = try buildRequest(messages: messages, maxTokens: maxTokens, stream: false)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw DeepSeekError.networkError
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Bilinmeyen hata"
            throw DeepSeekError.apiError("HTTP \(httpResponse.statusCode): \(errorBody)")
        }

        let chatResponse = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let content = chatResponse.choices.first?.message.content else {
            throw DeepSeekError.emptyResponse
        }
        return content.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func buildRequest(messages: [ChatMessage], maxTokens: Int, stream: Bool) throws -> URLRequest {
        guard let apiKey, !apiKey.isEmpty else {
            throw DeepSeekError.noAPIKey
        }

        var request = URLRequest(url: URL(string: "\(baseURL)/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60

        let body = ChatRequest(model: model, messages: messages, max_tokens: maxTokens, stream: stream)
        request.httpBody = try JSONEncoder().encode(body)

        return request
    }

    // MARK: - Models

    struct ChatMessage: Codable {
        let role: String
        let content: String
    }

    struct ChatHistoryItem {
        let role: String
        let content: String
    }

    struct Flashcard: Codable, Identifiable {
        var id: UUID { UUID() }
        let question: String
        let answer: String
    }

    private struct ChatRequest: Codable {
        let model: String
        let messages: [ChatMessage]
        let max_tokens: Int
        let stream: Bool
    }

    private struct ChatResponse: Codable {
        let choices: [Choice]
        struct Choice: Codable {
            let message: ChatMessage
        }
    }

    private struct StreamChunk: Codable {
        let choices: [StreamChoice]
        struct StreamChoice: Codable {
            let delta: Delta
        }
        struct Delta: Codable {
            let content: String?
        }
    }

    // MARK: - Errors

    enum DeepSeekError: LocalizedError {
        case noAPIKey
        case networkError
        case apiError(String)
        case emptyResponse
        case parseError

        var errorDescription: String? {
            switch self {
            case .noAPIKey: return "DeepSeek API anahtari ayarlanmamis"
            case .networkError: return "Ag baglantisi hatasi"
            case .apiError(let msg): return msg
            case .emptyResponse: return "Bos yanit alindi"
            case .parseError: return "Yanit ayristirma hatasi"
            }
        }
    }
}
