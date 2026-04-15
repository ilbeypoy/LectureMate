import SwiftUI
import SwiftData

struct RecordingDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(DeepSeekService.self) private var deepSeek
    let recording: LMRecording

    @State private var playerVM = PlayerViewModel()
    @State private var showChat = false
    @State private var showExportSheet = false
    @State private var isGeneratingSummary = false
    @State private var showEditTitle = false
    @State private var editedTitle = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Meta bilgiler
                metaInfoCard

                // Ses Oynatici
                AudioPlayerView(playerVM: playerVM)
                    .padding(.horizontal)

                // AI Ozet
                if deepSeek.isConfigured {
                    aiSummarySection
                } else {
                    AIOnboardingView()
                        .padding(.horizontal)
                }

                // Yer Imleri
                if !recording.bookmarks.isEmpty {
                    bookmarksSection
                }

                // Transkript
                transcriptSection
            }
            .padding(.vertical)
        }
        .navigationTitle(recording.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                if deepSeek.isConfigured {
                    Button {
                        showChat = true
                    } label: {
                        Image(systemName: "bubble.left.and.text.bubble.right")
                    }
                }

                Button {
                    showExportSheet = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }

                Menu {
                    Button("Basligi Duzenle", systemImage: "pencil") {
                        editedTitle = recording.title
                        showEditTitle = true
                    }
                    if deepSeek.isConfigured && recording.isTranscribed {
                        Button("AI Baslik Olustur", systemImage: "sparkles") {
                            Task { await generateAITitle() }
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .onAppear {
            if let url = recording.fileURL {
                playerVM.loadAudio(from: url)
            }
        }
        .onDisappear {
            playerVM.cleanup()
        }
        .sheet(isPresented: $showChat) {
            NavigationStack {
                ChatView(recording: recording)
            }
        }
        .sheet(isPresented: $showExportSheet) {
            exportSheet
        }
        .alert("Basligi Duzenle", isPresented: $showEditTitle) {
            TextField("Baslik", text: $editedTitle)
            Button("Kaydet") {
                recording.title = editedTitle
                try? modelContext.save()
            }
            Button("Iptal", role: .cancel) {}
        }
    }

    // MARK: - Meta Bilgiler

    private var metaInfoCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let classRef = recording.classRef {
                HStack {
                    Circle()
                        .fill(Color(hex: classRef.colorHex))
                        .frame(width: 10, height: 10)
                    Text(classRef.name)
                        .font(.subheadline.bold())
                        .foregroundStyle(.lmPrimary)
                }
            }

            HStack(spacing: 16) {
                Label(recording.recordedAt.dateString, systemImage: "calendar")
                Label(recording.formattedDuration, systemImage: "clock")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }

    // MARK: - AI Ozet

    private var aiSummarySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("AI Ozet", systemImage: "sparkles")
                    .font(.headline)
                Spacer()
                if recording.aiSummary == nil && recording.isTranscribed {
                    Button("Olustur") {
                        Task { await generateSummary() }
                    }
                    .font(.caption)
                    .disabled(isGeneratingSummary)
                }
            }

            if isGeneratingSummary {
                ProgressView("Ozet olusturuluyor...")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let summary = recording.aiSummary {
                Text(summary)
                    .font(.subheadline)
                    .padding()
                    .background(Color.lmSecondary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                Text("Transkript olusturulduktan sonra AI ozet uretebilirsiniz")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Yer Imleri

    private var bookmarksSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Yer Imleri")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(recording.bookmarks.sorted(by: { $0.timestamp < $1.timestamp })) { bookmark in
                        Button {
                            playerVM.seekToTimestamp(bookmark.timestamp)
                        } label: {
                            VStack(spacing: 2) {
                                Image(systemName: "bookmark.fill")
                                    .foregroundStyle(.lmWarning)
                                Text(bookmark.formattedTimestamp)
                                    .font(.caption2.monospaced())
                                if let label = bookmark.label {
                                    Text(label)
                                        .font(.caption2)
                                        .lineLimit(1)
                                }
                            }
                            .padding(8)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Transkript

    private var transcriptSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Transkript")
                .font(.headline)
                .padding(.horizontal)

            if recording.segments.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text")
                        .font(.title)
                        .foregroundStyle(.secondary)
                    Text("Henuz transkript yok")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
            } else {
                TranscriptView(
                    segments: recording.segments.sorted { $0.startTime < $1.startTime },
                    onSegmentTap: { segment in
                        playerVM.seekToTimestamp(segment.startTime)
                    },
                    currentTime: playerVM.player.currentTime
                )
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Export

    private var exportSheet: some View {
        NavigationStack {
            List {
                Button {
                    let service = ExportService()
                    let text = service.exportAsText(recording: recording)
                    if let url = service.saveExportedText(text, filename: recording.title) {
                        shareFile(url)
                    }
                } label: {
                    Label("Metin Olarak Aktar (.txt)", systemImage: "doc.text")
                }

                Button {
                    let service = ExportService()
                    let data = service.exportAsPDF(recording: recording)
                    if let url = service.saveExportedPDF(data, filename: recording.title) {
                        shareFile(url)
                    }
                } label: {
                    Label("PDF Olarak Aktar (.pdf)", systemImage: "doc.richtext")
                }
            }
            .navigationTitle("Disa Aktar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") { showExportSheet = false }
                }
            }
        }
        .presentationDetents([.height(200)])
    }

    // MARK: - Actions

    private func generateSummary() async {
        isGeneratingSummary = true
        do {
            let summary = try await deepSeek.generateSummary(for: recording.fullTranscript)
            recording.aiSummary = summary
            try? modelContext.save()
        } catch {
            // Hata sessizce yutulur
        }
        isGeneratingSummary = false
    }

    private func generateAITitle() async {
        do {
            let title = try await deepSeek.generateTitle(for: recording.fullTranscript)
            recording.title = title
            try? modelContext.save()
        } catch {
            // Hata sessizce yutulur
        }
    }

    private func shareFile(_ url: URL) {
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = scene.windows.first {
            window.rootViewController?.present(activityVC, animated: true)
        }
        showExportSheet = false
    }
}
