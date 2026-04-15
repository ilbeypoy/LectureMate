import SwiftUI

struct ChatBubbleView: View {
    let message: LMChatMessage

    var body: some View {
        HStack {
            if message.isUser { Spacer(minLength: 60) }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                // Rol etiketi
                HStack(spacing: 4) {
                    Image(systemName: message.isUser ? "person.fill" : "sparkles")
                        .font(.caption2)
                    Text(message.isUser ? "Sen" : "AI Asistan")
                        .font(.caption2.bold())
                }
                .foregroundStyle(message.isUser ? Color.lmPrimary : Color.lmSecondary)

                // Mesaj icerigi
                Text(message.content)
                    .font(.subheadline)
                    .padding(12)
                    .background(
                        message.isUser
                            ? Color.lmPrimary.opacity(0.1)
                            : Color(.systemGray6)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            if !message.isUser { Spacer(minLength: 60) }
        }
    }
}
