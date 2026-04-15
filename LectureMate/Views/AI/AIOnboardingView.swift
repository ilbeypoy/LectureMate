import SwiftUI

struct AIOnboardingView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.largeTitle)
                .foregroundStyle(.lmSecondary.opacity(0.6))

            Text("AI Ozellikleri")
                .font(.headline)

            Text("DeepSeek API anahtarinizi Ayarlar'dan ekleyerek su ozellikleri etkinlestirin:")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: 6) {
                featureRow(icon: "text.badge.star", text: "Otomatik baslik ve ozet")
                featureRow(icon: "bubble.left.and.text.bubble.right", text: "Transkript uzerinde soru-cevap")
                featureRow(icon: "rectangle.on.rectangle", text: "Calisma kartlari olusturma")
            }
            .padding(.top, 4)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.lmSecondary.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [6]))
        )
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(Color.lmSecondary)
                .frame(width: 20)
            Text(text)
                .font(.caption)
        }
    }
}
