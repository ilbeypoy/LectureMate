import SwiftUI

struct SettingsView: View {
    @Environment(DeepSeekService.self) private var deepSeek
    @State private var viewModel: SettingsViewModel?

    var body: some View {
        NavigationStack {
            if let vm = viewModel {
                settingsContent(vm)
            } else {
                ProgressView()
                    .onAppear {
                        viewModel = SettingsViewModel(deepSeek: deepSeek)
                    }
            }
        }
    }

    private func settingsContent(_ vm: SettingsViewModel) -> some View {
        Form {
            // DeepSeek API
            Section {
                NavigationLink {
                    APIKeySettingView(viewModel: vm)
                } label: {
                    HStack {
                        Label("DeepSeek API Anahtari", systemImage: "key")
                        Spacer()
                        if vm.hasAPIKey {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.lmSuccess)
                        } else {
                            Text("Ayarlanmamis")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } header: {
                Text("AI Entegrasyonu")
            } footer: {
                Text("DeepSeek API anahtari ekleyerek otomatik ozet, baslik olusturma ve soru-cevap ozelliklerini etkinlestirin.")
            }

            // Kayit Ayarlari
            Section("Kayit") {
                Toggle(isOn: Binding(
                    get: { vm.autoTranscribe },
                    set: { vm.autoTranscribe = $0 }
                )) {
                    Label("Otomatik Transkript", systemImage: "text.badge.checkmark")
                }

                Toggle(isOn: Binding(
                    get: { vm.notificationsEnabled },
                    set: { newValue in
                        vm.notificationsEnabled = newValue
                        Task { await vm.toggleNotifications() }
                    }
                )) {
                    Label("Ders Hatirlaticilari", systemImage: "bell.badge")
                }
            }

            // Depolama
            Section("Depolama") {
                HStack {
                    Label("Kullanilan Alan", systemImage: "internaldrive")
                    Spacer()
                    Text(vm.storageUsed)
                        .foregroundStyle(.secondary)
                }
            }

            // Hakkinda
            Section("Hakkinda") {
                HStack {
                    Text("Surum")
                    Spacer()
                    Text("1.0.0")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text("Gelistirici")
                    Spacer()
                    Text("LectureMate")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Ayarlar")
    }
}
