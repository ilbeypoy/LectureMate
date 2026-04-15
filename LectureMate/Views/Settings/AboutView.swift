import SwiftUI

struct AboutView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "mic.badge.waveform")
                .font(.system(size: 60))
                .foregroundStyle(Color.lmPrimary)

            Text("LectureMate")
                .font(.largeTitle.bold())

            Text("Ders Ses Kaydi & AI Asistan")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                featureItem(icon: "mic.fill", text: "Ders ses kaydi")
                featureItem(icon: "text.bubble", text: "Apple Speech ile ucretsiz transkript")
                featureItem(icon: "calendar", text: "Akilli ders programi")
                featureItem(icon: "sparkles", text: "DeepSeek AI entegrasyonu")
                featureItem(icon: "square.and.arrow.up", text: "PDF/Metin disa aktarma")
            }
            .padding()

            Spacer()

            Text("Surum 1.0.0")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .navigationTitle("Hakkinda")
    }

    private func featureItem(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Color.lmPrimary)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
            Spacer()
        }
    }
}
