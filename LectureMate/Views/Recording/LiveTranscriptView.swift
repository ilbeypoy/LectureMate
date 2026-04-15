import SwiftUI

struct LiveTranscriptView: View {
    let text: String

    var body: some View {
        ScrollView {
            ScrollViewReader { proxy in
                VStack(alignment: .leading) {
                    if text.isEmpty {
                        HStack {
                            Spacer()
                            VStack(spacing: 8) {
                                Image(systemName: "text.bubble")
                                    .font(.title2)
                                    .foregroundStyle(.secondary)
                                Text("Konusmaya baslayin...")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.top, 30)
                    } else {
                        Text(text)
                            .font(.system(.body, design: .rounded))
                            .foregroundStyle(.primary)
                            .id("transcriptEnd")
                    }
                }
                .padding()
                .onChange(of: text) {
                    withAnimation {
                        proxy.scrollTo("transcriptEnd", anchor: .bottom)
                    }
                }
            }
        }
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
