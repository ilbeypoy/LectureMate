import SwiftUI
import SwiftData

struct RecordingView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = RecordingViewModel()
    @State private var showBookmarkLabel = false
    @State private var bookmarkLabel = ""
    @State private var showCancelAlert = false
    @State private var savedRecording: LMRecording?
    @State private var showDetail = false

    var selectedClass: LMClass?

    var body: some View {
        NavigationStack {
            ZStack {
                // Arka plan gradyani
                LinearGradient(
                    colors: [Color(.systemBackground), Color.lmPrimary.opacity(0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 24) {
                    // Ders bilgisi
                    if let classRef = selectedClass ?? viewModel.selectedClass {
                        HStack {
                            Circle()
                                .fill(Color(hex: classRef.colorHex))
                                .frame(width: 10, height: 10)
                            Text(classRef.name)
                                .font(.subheadline.bold())
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                    }

                    Spacer()

                    // Zaman gostergesi
                    Text(viewModel.recorder.formattedCurrentTime)
                        .font(.system(size: 64, weight: .thin, design: .monospaced))
                        .contentTransition(.numericText())

                    // Dalga formu
                    LiveWaveformView(audioLevel: viewModel.recorder.audioLevel, isRecording: viewModel.state == .recording)
                        .frame(height: 80)
                        .padding(.horizontal)

                    // Canli transkript
                    LiveTranscriptView(text: viewModel.transcription.liveTranscript)
                        .frame(height: 120)
                        .padding(.horizontal)

                    Spacer()

                    // Kontroller
                    RecordingControlsView(
                        state: viewModel.state,
                        onStart: {
                            viewModel.selectedClass = selectedClass
                            viewModel.startRecording()
                        },
                        onPause: { viewModel.pauseRecording() },
                        onResume: { viewModel.resumeRecording() },
                        onStop: {
                            savedRecording = viewModel.stopAndSave(modelContext: modelContext)
                            if savedRecording != nil {
                                dismiss()
                            }
                        },
                        onBookmark: { showBookmarkLabel = true }
                    )

                    // Yer imi sayisi
                    if !viewModel.bookmarks.isEmpty {
                        Text("\(viewModel.bookmarks.count) yer imi")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") {
                        if viewModel.isRecording {
                            showCancelAlert = true
                        } else {
                            dismiss()
                        }
                    }
                }
            }
            .alert("Kaydi Iptal Et?", isPresented: $showCancelAlert) {
                Button("Iptal Et", role: .destructive) {
                    viewModel.cancelRecording()
                    dismiss()
                }
                Button("Kayda Devam", role: .cancel) {}
            } message: {
                Text("Kayit silinecek ve kurtarilamaz.")
            }
            .alert("Yer Imi Ekle", isPresented: $showBookmarkLabel) {
                TextField("Etiket (istege bagli)", text: $bookmarkLabel)
                Button("Ekle") {
                    viewModel.addBookmark(label: bookmarkLabel.isEmpty ? nil : bookmarkLabel)
                    bookmarkLabel = ""
                }
                Button("Iptal", role: .cancel) { bookmarkLabel = "" }
            }
        }
    }
}
