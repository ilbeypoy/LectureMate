import SwiftUI
import SwiftData

struct ChatView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(DeepSeekService.self) private var deepSeek
    @Environment(\.dismiss) private var dismiss
    let recording: LMRecording

    @State private var viewModel: ChatViewModel?
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            if let vm = viewModel {
                // Mesaj listesi
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            // Baslangic bilgisi
                            VStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .font(.title)
                                    .foregroundStyle(.lmSecondary)
                                Text("AI Asistan")
                                    .font(.headline)
                                Text("\"\(recording.title)\" kaydinin transkriptine dayali sorular sorabilirsiniz.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.vertical, 20)

                            ForEach(vm.messages) { message in
                                ChatBubbleView(message: message)
                                    .id(message.id)
                            }

                            // Streaming yanit
                            if !vm.streamingResponse.isEmpty {
                                ChatBubbleView(
                                    message: LMChatMessage(role: "assistant", content: vm.streamingResponse)
                                )
                                .id("streaming")
                            }

                            // Yukleniyor gostergesi
                            if vm.isLoading && vm.streamingResponse.isEmpty {
                                HStack {
                                    ProgressView()
                                        .padding(.horizontal)
                                    Spacer()
                                }
                                .id("loading")
                            }
                        }
                        .padding()
                    }
                    .onChange(of: vm.messages.count) {
                        withAnimation {
                            proxy.scrollTo(vm.messages.last?.id, anchor: .bottom)
                        }
                    }
                    .onChange(of: vm.streamingResponse) {
                        withAnimation {
                            proxy.scrollTo("streaming", anchor: .bottom)
                        }
                    }
                }

                Divider()

                // Hata mesaji
                if let error = vm.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                        .padding(.top, 4)
                }

                // Mesaj girisi
                HStack(spacing: 8) {
                    TextField("Bir soru sorun...", text: Binding(
                        get: { vm.inputText },
                        set: { vm.inputText = $0 }
                    ), axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)
                        .focused($isInputFocused)

                    Button {
                        Task {
                            await vm.sendMessage(modelContext: modelContext)
                        }
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .foregroundStyle(.lmPrimary)
                    }
                    .disabled(vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || vm.isLoading)
                }
                .padding()
            } else {
                ProgressView("Yukleniyor...")
            }
        }
        .navigationTitle("AI Sohbet")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Kapat") { dismiss() }
            }
            if let vm = viewModel, !vm.messages.isEmpty {
                ToolbarItem(placement: .primaryAction) {
                    Button("Temizle", systemImage: "trash") {
                        vm.clearChat(modelContext: modelContext)
                    }
                }
            }
        }
        .onAppear {
            viewModel = ChatViewModel(recording: recording, deepSeek: deepSeek)
        }
    }
}
