import SwiftUI

struct APIKeySettingView: View {
    @Bindable var viewModel: SettingsViewModel
    @State private var showKey = false

    var body: some View {
        Form {
            Section {
                HStack {
                    if showKey {
                        TextField("API Anahtari", text: Binding(
                            get: { viewModel.apiKey },
                            set: { viewModel.apiKey = $0 }
                        ))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    } else {
                        SecureField("API Anahtari", text: Binding(
                            get: { viewModel.apiKey },
                            set: { viewModel.apiKey = $0 }
                        ))
                        .textInputAutocapitalization(.never)
                    }

                    Button {
                        showKey.toggle()
                    } label: {
                        Image(systemName: showKey ? "eye.slash" : "eye")
                    }
                }
            } header: {
                Text("DeepSeek API Anahtari")
            } footer: {
                Text("API anahtariniz cihazinizda guvenli bir sekilde (Keychain) saklanir ve sadece AI ozelliklerini kullanmak icin DeepSeek sunucularina gonderilir.")
            }

            Section {
                Button {
                    viewModel.saveAPIKey()
                } label: {
                    Label("Anahtari Kaydet", systemImage: "checkmark.circle")
                }
                .disabled(viewModel.apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                Button {
                    Task { await viewModel.testConnection() }
                } label: {
                    HStack {
                        Label("Baglanti Test Et", systemImage: "antenna.radiowaves.left.and.right")
                        Spacer()
                        if viewModel.isTestingConnection {
                            ProgressView()
                        }
                    }
                }
                .disabled(viewModel.apiKey.isEmpty || viewModel.isTestingConnection)

                if let result = viewModel.connectionTestResult {
                    switch result {
                    case .success:
                        Label("Baglanti basarili!", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Color.lmSuccess)
                    case .failure(let message):
                        Label(message, systemImage: "xmark.circle.fill")
                            .foregroundStyle(.red)
                    }
                }
            }

            if viewModel.hasAPIKey {
                Section {
                    Button(role: .destructive) {
                        viewModel.deleteAPIKey()
                    } label: {
                        Label("Anahtari Sil", systemImage: "trash")
                    }
                }
            }
        }
        .navigationTitle("API Ayarlari")
        .navigationBarTitleDisplayMode(.inline)
    }
}
